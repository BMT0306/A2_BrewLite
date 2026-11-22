/**
 * @file orders.service.ts
 * @description Xử lý nghiệp vụ đặt hàng nguyên tử trong Database Transaction và trừ tồn kho (FR-05, UC-05)
 * @author Thành viên Chính 2 - Backend & Database Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../common/storage/storage.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { FALLBACK_PRODUCTS } from "../products/products.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  public get inMemoryOrders(): any[] {
    return this.storageService.getOrders();
  }

  private enrichOrdersWithRecipe(orders: any[]) {
    return orders.map((o) => ({
      ...o,
      items: (o.items || []).map((it: any) => {
        const prodMatch = FALLBACK_PRODUCTS.find(
          (p) => p.id === it.productId || p.name === it.product?.name,
        );
        return {
          ...it,
          product: {
            ...(it.product || {}),
            recipe:
              it.product?.recipe ||
              prodMatch?.recipe ||
              "Nguyên liệu tự nhiên tuyển chọn, pha chế theo công thức Barista BrewLite.",
          },
        };
      }),
    }));
  }

  /**
   * Tính toán đơn giá chuẩn xác hoàn toàn trên phía Server từ dữ liệu DB/Catalog
   * Tuyệt đối KHÔNG tin tưởng unitPrice hoặc giá topping do Client gửi lên (Chống Price Tampering)
   */
  private calculateAuthoritativeItemPricing(
    product: any,
    size?: string,
    toppings?: any[],
  ): { unitPrice: number; selectedToppings: { name: string; price: number }[] } {
    const basePrice = Number(product.basePrice || 0);
    const sizeOptions = Array.isArray(product.sizeOptions) ? product.sizeOptions : [];
    const matchedSize = sizeOptions.find(
      (s: any) => String(s?.size || "").trim().toLowerCase() === String(size || "").trim().toLowerCase(),
    );
    const sizePrice = matchedSize ? Number(matchedSize.price || 0) : 0;

    const toppingOptions = Array.isArray(product.toppingOptions) ? product.toppingOptions : [];
    const selectedToppings: { name: string; price: number }[] = [];
    let toppingsTotal = 0;

    if (Array.isArray(toppings)) {
      for (const rawTopping of toppings) {
        const toppingName =
          typeof rawTopping === "string"
            ? rawTopping.trim()
            : String(rawTopping?.name || "").trim();
        if (!toppingName) continue;

        const matchedTopping = toppingOptions.find(
          (t: any) => String(t?.name || "").trim().toLowerCase() === toppingName.toLowerCase(),
        );
        if (matchedTopping) {
          const authoritativePrice = Number(matchedTopping.price || 0);
          toppingsTotal += authoritativePrice;
          selectedToppings.push({
            name: matchedTopping.name,
            price: authoritativePrice,
          });
        }
      }
    }

    return {
      unitPrice: Math.max(0, basePrice + sizePrice + toppingsTotal),
      selectedToppings,
    };
  }

  private assertCanViewOrder(order: any, requester?: { id: string; role: string }) {
    if (!requester) return;
    const isStaff = requester.role === "STAFF" || requester.role === "MANAGER";
    if (!isStaff && order.userId && order.userId !== requester.id) {
      throw new ForbiddenException(
        "Bạn không có quyền xem thông tin đơn hàng của tài khoản khác.",
      );
    }
  }

  private assertCanUpdateStatus(
    order: any,
    nextStatus: OrderStatus,
    requester?: { id: string; role: string },
  ) {
    if (!requester) return;
    const isStaff = requester.role === "STAFF" || requester.role === "MANAGER";
    if (isStaff) return;

    if (order.userId && order.userId !== requester.id) {
      throw new ForbiddenException(
        "Bạn không có quyền thay đổi trạng thái đơn hàng của tài khoản khác.",
      );
    }
    if (nextStatus !== OrderStatus.CANCELLED) {
      throw new ForbiddenException(
        "Khách hàng không có quyền chuyển trạng thái pha chế. Chỉ tài khoản Nhân viên / Quản lý mới được phép.",
      );
    }
  }

  async create(userId: string, dto: CreateOrderDto) {
    for (const item of dto.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException("Số lượng sản phẩm phải là số nguyên dương lớn hơn hoặc bằng 1.");
      }
    }

    if (this.prisma.isConnected) {
      try {
        // Thực thi tạo đơn hàng nguyên tử bên trong Prisma Interactive Transaction
        return await this.prisma.$transaction(async (tx) => {
          let subtotal = new Prisma.Decimal(0);
          const verifiedItems: {
            productId: string;
            size: string;
            selectedToppings: { name: string; price: number }[];
            quantity: number;
            unitPrice: Prisma.Decimal;
            lineTotal: Prisma.Decimal;
          }[] = [];

          // 1. Kiểm tra tồn kho, định giá chuẩn từ DB và trừ kho nguyên tử
          for (const item of dto.items) {
            let product = await tx.product.findUnique({
              where: { id: item.productId },
            });

            // Tự động đồng bộ từ FALLBACK_PRODUCTS nếu bảng Database vừa khởi tạo chưa kịp seed
            if (!product) {
              const fallback = FALLBACK_PRODUCTS.find(
                (p) => p.id === item.productId,
              );
              if (fallback) {
                const initStock = this.storageService.getProductStock(
                  fallback.id,
                  fallback.stockQuantity,
                );
                product = await tx.product.create({
                  data: {
                    id: fallback.id,
                    name: fallback.name,
                    description: fallback.description,
                    category: fallback.category as any,
                    basePrice: fallback.basePrice,
                    imageUrl: fallback.imageUrl,
                    stockQuantity: initStock,
                    isAvailable: initStock > 0 && fallback.isAvailable,
                    sizeOptions: fallback.sizeOptions || [],
                    toppingOptions: fallback.toppingOptions || [],
                  } as any,
                });
              } else {
                throw new NotFoundException(
                  `Không tìm thấy sản phẩm ${item.productId}`,
                );
              }
            }

            if (!product.isAvailable || product.stockQuantity < item.quantity) {
              throw new ConflictException(
                `Sản phẩm "${product.name}" hiện không đủ tồn kho (Còn lại: ${product.stockQuantity}, yêu cầu: ${item.quantity}). Vui lòng cập nhật giỏ hàng.`,
              );
            }

            // Trừ tồn kho nguyên tử cấp cơ sở dữ liệu
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { decrement: item.quantity },
              },
            });

            // Tính toán đơn giá chuẩn xác từ bảng Product (chống giả mạo giá từ Client)
            const pricing = this.calculateAuthoritativeItemPricing(
              product,
              item.size,
              item.toppings,
            );
            const verifiedUnitPrice = new Prisma.Decimal(pricing.unitPrice);
            const lineTotal = verifiedUnitPrice.mul(item.quantity);
            subtotal = subtotal.add(lineTotal);

            verifiedItems.push({
              productId: item.productId,
              size: item.size,
              selectedToppings: pricing.selectedToppings,
              quantity: item.quantity,
              unitPrice: verifiedUnitPrice,
              lineTotal,
            });
          }

          // Đảm bảo User tồn tại trong DB trước khi tạo Order (Foreign Key constraint)
          if (
            (tx as any).user &&
            typeof (tx as any).user.findUnique === "function"
          ) {
            const userExists = await tx.user.findUnique({
              where: { id: userId },
            });
            if (!userExists) {
              const memUser = this.storageService.getUserById(userId) || {
                id: userId,
                email: "customer@brewlite.vn",
                fullName: "Nguyễn Văn Khách",
                role: "CUSTOMER",
                loyaltyPoints: 120,
                passwordHash:
                  "$2b$10$epBzX9gG5o8Y9qEwO1lJ.u9jZq9N3zZ.V0oD0V7g.g5.",
              };
              await tx.user.create({
                data: {
                  id: memUser.id,
                  email: memUser.email,
                  fullName: memUser.fullName,
                  role: (memUser.role as any) || "CUSTOMER",
                  loyaltyPoints: memUser.loyaltyPoints || 0,
                  passwordHash:
                    memUser.passwordHash ||
                    "$2b$10$epBzX9gG5o8Y9qEwO1lJ.u9jZq9N3zZ.V0oD0V7g.g5.",
                },
              });
            }
          }

          // 2. Xử lý mã voucher khuyến mãi (nếu có)
          let discountAmount = new Prisma.Decimal(0);
          let promotionId: string | null = null;
          if (dto.promotionCode) {
            const promo = await tx.promotion.findUnique({
              where: { code: dto.promotionCode.toUpperCase().trim() },
            });
            if (promo && promo.isActive && new Date() <= promo.validUntil) {
              promotionId = promo.id;
              const calcDiscount = subtotal.mul(promo.discountPercent).div(100);
              discountAmount = calcDiscount.greaterThan(promo.maxDiscountAmount)
                ? promo.maxDiscountAmount
                : calcDiscount;
            }
          }

          const totalAmount = subtotal.sub(discountAmount);
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const orderCode = `BL-${Date.now().toString().slice(-6)}-${randomSuffix}`;

          // 3. Khởi tạo bản ghi Order kèm các OrderItems
          const order = await tx.order.create({
            data: {
              orderCode,
              userId,
              promotionId,
              status: OrderStatus.PENDING,
              subtotalAmount: subtotal,
              discountAmount,
              totalAmount,
              note: dto.note || null,
              items: {
                create: verifiedItems.map((item) => ({
                  productId: item.productId,
                  size: item.size,
                  selectedToppings: item.selectedToppings,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  lineTotal: item.lineTotal,
                })),
              },
            },
            include: {
              items: {
                include: { product: true },
              },
            },
          });

          // Tự động trừ số lượng ly tồn kho món đồ uống và trừ kho nguyên liệu theo định mức công thức BOM
          this.storageService.deductProductAndIngredients(
            order.orderCode,
            dto.items,
          );

          return {
            orderId: order.id,
            orderCode: order.orderCode,
            status: order.status,
            subtotalAmount: order.subtotalAmount,
            discountAmount: order.discountAmount,
            totalAmount: order.totalAmount,
            itemsCount: order.items.length,
            createdAt: order.createdAt,
          };
        });
      } catch (err: any) {
        if (
          err instanceof NotFoundException ||
          err instanceof ConflictException ||
          err instanceof BadRequestException
        ) {
          throw err;
        }
      }
    }

    // Khi PostgreSQL offline, xử lý dự phòng trên bộ nhớ (In-memory fallback)
    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const prod = FALLBACK_PRODUCTS.find((p) => p.id === item.productId);
      if (!prod) {
        throw new NotFoundException(`Không tìm thấy sản phẩm ${item.productId}`);
      }

      // Kiểm tra tồn kho thời gian thực từ StorageService
      const currentStock = this.storageService.getProductStock(
        item.productId,
        prod.stockQuantity ?? 10,
      );
      if (currentStock < item.quantity) {
        throw new ConflictException(
          `Sản phẩm "${prod.name}" hiện không đủ tồn kho (Còn lại: ${currentStock}, yêu cầu: ${item.quantity}). Vui lòng cập nhật giỏ hàng.`,
        );
      }

      const pricing = this.calculateAuthoritativeItemPricing(
        prod,
        item.size,
        item.toppings,
      );
      const lineTotal = pricing.unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: item.productId,
        size: item.size,
        selectedToppings: pricing.selectedToppings,
        quantity: item.quantity,
        unitPrice: pricing.unitPrice,
        lineTotal,
        product: {
          ...prod,
          stockQuantity: currentStock,
        },
      };
    });

    let discountAmount = 0;
    if (dto.promotionCode) {
      const pCode = dto.promotionCode.toUpperCase().trim();
      if (pCode === "WELCOME10" || pCode === "BREW10") {
        discountAmount = Math.min(Math.round(subtotal * 0.1), 50000);
      } else if (pCode === "WELCOME20") {
        discountAmount = Math.min(Math.round(subtotal * 0.2), 50000);
      }
    }
    const totalAmount = subtotal - discountAmount;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `BL-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    const mockOrder = {
      id: `ord-${Date.now()}`,
      orderCode,
      userId,
      status: OrderStatus.PENDING,
      subtotalAmount: subtotal,
      discountAmount,
      totalAmount,
      note: dto.note || null,
      items: orderItems,
      payments: [],
      createdAt: new Date(),
    };

    // Tự động trừ số lượng ly tồn kho món đồ uống và trừ kho nguyên liệu theo định mức công thức BOM
    this.storageService.deductProductAndIngredients(
      mockOrder.orderCode,
      dto.items,
    );
    this.storageService.saveOrder(mockOrder);

    return {
      orderId: mockOrder.id,
      orderCode: mockOrder.orderCode,
      status: mockOrder.status,
      subtotalAmount: mockOrder.subtotalAmount,
      discountAmount: mockOrder.discountAmount,
      totalAmount: mockOrder.totalAmount,
      itemsCount: mockOrder.items.length,
      createdAt: mockOrder.createdAt,
    };
  }

  async findUserOrders(userId: string, role?: string) {
    if (this.prisma.isConnected) {
      try {
        const where: Prisma.OrderWhereInput = {};
        if (role !== "STAFF" && role !== "MANAGER") {
          where.userId = userId;
        }

        const orders = await this.prisma.order.findMany({
          where,
          include: {
            items: {
              include: { product: true },
            },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        });
        if (orders && orders.length > 0)
          return this.enrichOrdersWithRecipe(orders);
      } catch {
        // Fallback
      }
    }
    const all = this.inMemoryOrders;
    if (role !== "STAFF" && role !== "MANAGER") {
      const userOrders = all.filter((o) => !o.userId || o.userId === userId);
      return this.enrichOrdersWithRecipe(userOrders);
    }
    return this.enrichOrdersWithRecipe(all);
  }

  async findOne(id: string, requester?: { id: string; role: string }) {
    if (this.prisma.isConnected) {
      try {
        const order = await this.prisma.order.findFirst({
          where: {
            OR: [{ id }, { orderCode: id }],
          },
          include: {
            items: {
              include: { product: true },
            },
            payments: true,
            user: {
              select: { id: true, fullName: true, email: true, phone: true },
            },
          },
        });
        if (order) {
          this.assertCanViewOrder(order, requester);
          return this.enrichOrdersWithRecipe([order])[0];
        }
      } catch (err: any) {
        if (err instanceof ForbiddenException || err instanceof NotFoundException) {
          throw err;
        }
        // In-memory fallback
      }
    }

    const memoryOrder = this.inMemoryOrders.find(
      (o) => o.id === id || o.orderCode === id,
    );
    if (!memoryOrder) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${id}`);
    }
    this.assertCanViewOrder(memoryOrder, requester);
    return this.enrichOrdersWithRecipe([memoryOrder])[0];
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    requester?: { id: string; role: string },
  ) {
    if (this.prisma.isConnected) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id },
          include: { items: true, payments: true },
        });

        if (order) {
          this.assertCanUpdateStatus(order, dto.status, requester);
          // Xử lý Giao dịch bù trừ (Compensating Transaction) khi Hủy đơn hàng (Order Cancellation & Refund)
          if (dto.status === OrderStatus.CANCELLED) {
            if (order.status === OrderStatus.CANCELLED) {
              return order;
            }
            return await this.prisma.$transaction(async (tx) => {
              // 1. Tự động hoàn lại số lượng tồn kho cho tất cả món trong đơn
              for (const item of order.items) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stockQuantity: { increment: item.quantity },
                    isAvailable: true,
                  },
                });
              }

              // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
              this.storageService.restoreProductAndIngredients(
                order.orderCode,
                order.items.map((it) => ({
                  productId: it.productId,
                  quantity: it.quantity,
                })),
              );

              // 2. Tự động hoàn tiền (Refund) các giao dịch thanh toán đã thành công
              for (const payment of order.payments) {
                if (payment.status === PaymentStatus.PAID) {
                  await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.REFUNDED },
                  });
                }
              }

              // 3. Cập nhật trạng thái đơn hàng sang CANCELLED
              const updated = await tx.order.update({
                where: { id },
                data: { status: OrderStatus.CANCELLED },
                include: { items: true, payments: true },
              });
              const hadPaid = order.payments.some(
                (p) => p.status === PaymentStatus.PAID,
              );
              return {
                ...updated,
                ...(hadPaid ? { refundStatus: "REFUNDED" } : {}),
              };
            });
          }

          return await this.prisma.order.update({
            where: { id },
            data: { status: dto.status },
            include: {
              items: true,
              payments: true,
            },
          });
        }
      } catch (err: any) {
        if (
          err instanceof ForbiddenException ||
          err instanceof BadRequestException ||
          err instanceof NotFoundException
        ) {
          throw err;
        }
        // In-memory fallback khi DB offline
      }
    }

    const memoryOrder = this.inMemoryOrders.find((o) => o.id === id);
    if (!memoryOrder) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID ${id}`);
    }
    this.assertCanUpdateStatus(memoryOrder, dto.status, requester);
    if (dto.status === OrderStatus.CANCELLED && memoryOrder.status === OrderStatus.CANCELLED) {
      return memoryOrder;
    }
    memoryOrder.status = dto.status;
    if (dto.status === OrderStatus.CANCELLED) {
      // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
      if (memoryOrder.items) {
        this.storageService.restoreProductAndIngredients(
          memoryOrder.orderCode,
          memoryOrder.items.map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
        );
      }

      // Chỉ đánh dấu hoàn tiền nếu đơn hàng ĐÃ ĐƯỢC THANH TOÁN trước đó
      let wasPaid = false;
      if (memoryOrder.payments && memoryOrder.payments.length > 0) {
        memoryOrder.payments.forEach((p: any) => {
          if (p.status === "PAID") {
            p.status = "REFUNDED";
            wasPaid = true;
          }
        });
      }
      if (wasPaid) {
        memoryOrder.refundStatus = "REFUNDED";
      } else {
        delete memoryOrder.refundStatus;
      }
    }
    this.storageService.updateOrderStatus(
      memoryOrder.id,
      dto.status,
      memoryOrder.refundStatus,
    );
    return memoryOrder;
  }

  /**
   * Xóa đơn hàng nháp (PENDING) khi khách hàng bấm sửa món hoặc hủy thanh toán
   * Thực hiện Giao dịch bù trừ tự động hoàn trả số lượng tồn kho
   */
  async remove(id: string, requesterUserId?: string) {
    if (this.prisma.isConnected) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id },
          include: { items: true, payments: true },
        });

        if (order) {
          if (requesterUserId && order.userId && order.userId !== requesterUserId) {
            throw new ForbiddenException(
              "Bạn không có quyền xóa đơn hàng của người dùng khác.",
            );
          }
          if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
              "Chỉ có thể xóa bỏ đơn hàng đang ở trạng thái Chờ thanh toán (PENDING).",
            );
          }

          return await this.prisma.$transaction(async (tx) => {
            // 1. Tự động hoàn lại số lượng tồn kho cho các món
            for (const item of order.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: { increment: item.quantity },
                },
              });
            }

            // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
            this.storageService.restoreProductAndIngredients(
              order.orderCode,
              order.items.map((it) => ({
                productId: it.productId,
                quantity: it.quantity,
              })),
            );

            // 2. Xóa chi tiết đơn hàng và đơn hàng
            await tx.orderItem.deleteMany({ where: { orderId: id } });
            await tx.order.delete({ where: { id } });

            return {
              success: true,
              message: "Đã hủy đơn nháp và hoàn trả tồn kho thành công",
              id,
            };
          });
        }
      } catch (err: any) {
        if (err instanceof BadRequestException || err instanceof ForbiddenException) throw err;
        // In-memory fallback khi DB offline
      }
    }

    const memIndex = this.inMemoryOrders.findIndex(
      (o) => o.id === id || o.orderCode === id,
    );
    if (memIndex === -1) {
      return {
        success: true,
        message: "Đơn hàng không tồn tại hoặc đã được xóa",
      };
    }

    const memOrder = this.inMemoryOrders[memIndex];
    if (requesterUserId && memOrder.userId && memOrder.userId !== requesterUserId) {
      throw new ForbiddenException(
        "Bạn không có quyền xóa đơn hàng của người dùng khác.",
      );
    }
    if (memOrder.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        "Chỉ có thể xóa bỏ đơn hàng đang ở trạng thái Chờ thanh toán (PENDING).",
      );
    }

    // Hoàn trả số lượng ly tồn kho và hoàn trả nguyên liệu kho theo định mức BOM
    if (memOrder.items) {
      this.storageService.restoreProductAndIngredients(
        memOrder.orderCode,
        memOrder.items.map((it: any) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
      );
    }

    this.storageService.removeOrder(memOrder.id);
    return {
      success: true,
      message: "Đã hủy đơn nháp và hoàn trả tồn kho thành công",
      id: memOrder.id,
    };
  }
}
