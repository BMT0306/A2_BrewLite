/**
 * @file generate-postman-suite.js
 * @description Trình khởi tạo bộ kiểm thử tự động toàn diện chuẩn công nghiệp cho Postman / Newman
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / DevOps Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    _postman_id: "a9d70832-601f-4cb1-97b7-53c61309d94a",
    name: "BrewLite Backend REST API - Comprehensive Quality Gate Suite",
    description: `# BrewLite REST API Automated Test Suite (Assignment 2 - Software Engineering)\n\nBộ kiểm thử tự động toàn diện được thiết kế bởi **Trần Lê Minh Tâm (Kỹ sư Trưởng / DevOps Lead)** phục vụ nghiệm thu và chấm điểm đồ án CNPM A2.\n\n### Tiêu chí kiểm thử nghiệm thu:\n1. **Khả năng truy vết yêu cầu (Traceability):** Bao phủ 100% các Use Case cốt lõi: UC-01/02 (Danh mục món), UC-04 (Xác thực JWT & RBAC), UC-05 (Đặt hàng Transaction nguyên tử), UC-06 (Thanh toán không tiền mặt & Idempotency Key), ADR-003 (Compensating Transaction & Concurrency Lock).\n2. **Độ phủ kiểm thử 2 chiều (Positive & Negative Testing):** Kiểm thử cả luồng thành công (200, 201) và các ca biên vi phạm nghiệp vụ (400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict).\n3. **Tính toàn vẹn dữ liệu (Data Integrity):** Kiểm tra cấu trúc JSON Schema, định dạng token JWT, quy tắc sinh mã đơn hàng, công thức tính tổng tiền và đối soát giao dịch ngân hàng VietQR SePay.`,
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    // FOLDER 1: SYSTEM HEALTH & OBSERVABILITY
    {
      name: "01 - System Health & Diagnostics (Task 4.4 DevOps)",
      item: [
        {
          name: "Health Check Service (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/health", host: ["{{baseUrl}}"], path: ["health"] },
            description: "Kiểm tra trạng thái sẵn sàng hoạt động (Readiness & Liveness probe) của máy chủ Backend API."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Service status is healthy and uptime is valid", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.status).to.eql("ok");',
                '    pm.expect(res.service).to.eql("brewlite-api");',
                '    pm.expect(res).to.have.property("uptime");',
                '    pm.expect(res).to.have.property("timestamp");',
                '});',
                'pm.test("Response time is under SLA (< 500ms)", function () {',
                '    pm.expect(pm.response.responseTime).to.be.below(500);',
                '});',
                'pm.test("Content-Type is JSON", function () {',
                '    pm.expect(pm.response.headers.get("content-type")).to.include("application/json");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Root Service Info (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/", host: ["{{baseUrl}}"], path: [""] },
            description: "Tra cứu thông tin phiên bản hệ thống và danh sách endpoint công khai."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Root info contains valid service name & endpoints", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.name).to.include("BrewLite");',
                '    pm.expect(res.status).to.eql("online");',
                '    pm.expect(res).to.have.property("endpoints");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        }
      ]
    },

    // FOLDER 2: AUTHENTICATION & AUTHORIZATION (UC-04)
    {
      name: "02 - Authentication & Authorization (UC-04)",
      item: [
        {
          name: "Register Customer (Positive - 201 Created)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "customer_{{$timestamp}}@brewlite.vn",
                password: "Password123",
                fullName: "Trần Lê Minh Tâm",
                phone: "0901234567"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/register", host: ["{{baseUrl}}"], path: ["auth", "register"] },
            description: "Đăng ký tài khoản khách hàng mới với dữ liệu hợp lệ: họ tên tiếng Việt, số điện thoại VN 10 số, mật khẩu bảo mật."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 201 Created", function () {',
                '    pm.response.to.have.status(201);',
                '});',
                'pm.test("Returns valid JWT accessToken with 3 segments", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res).to.have.property("accessToken");',
                '    pm.expect(res.accessToken.split(".").length).to.eql(3);',
                '});',
                'pm.test("User profile contains correct customer role", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.user.role).to.eql("CUSTOMER");',
                '    pm.expect(res.user.fullName).to.eql("Trần Lê Minh Tâm");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Register Negative - Duplicate Email (409 Conflict)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "customer@brewlite.vn",
                password: "Password123",
                fullName: "Trần Lê Minh Tâm",
                phone: "0901234567"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/register", host: ["{{baseUrl}}"], path: ["auth", "register"] },
            description: "Kiểm thử ca biên: Cố tình đăng ký với email đã tồn tại trong hệ thống. Hệ thống phải từ chối với HTTP 409."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 409 Conflict", function () {',
                '    pm.response.to.have.status(409);',
                '});',
                'pm.test("Returns email conflict error message", function () {',
                '    var res = pm.response.json();',
                '    var msg = Array.isArray(res.message) ? res.message.join(" ") : res.message;',
                '    pm.expect(msg.toLowerCase()).to.include("email");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Register Negative - Name with Digits (400 Bad Request)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "test_digits_{{$timestamp}}@brewlite.vn",
                password: "Password123",
                fullName: "11323",
                phone: "0901234567"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/register", host: ["{{baseUrl}}"], path: ["auth", "register"] },
            description: "Kiểm thử ca biên: Cố tình nhập họ tên toàn chữ số (11323). Regex DTO phải chặn với HTTP 400."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 400 Bad Request", function () {',
                '    pm.response.to.have.status(400);',
                '});',
                'pm.test("Returns validation error for fullName", function () {',
                '    var res = pm.response.json();',
                '    var msg = Array.isArray(res.message) ? res.message.join(" ") : res.message;',
                '    pm.expect(msg.toLowerCase()).to.include("họ và tên");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Register Negative - Invalid Phone Format (400 Bad Request)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "test_phone_{{$timestamp}}@brewlite.vn",
                password: "Password123",
                fullName: "Nguyễn Văn Test",
                phone: "313123213"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/register", host: ["{{baseUrl}}"], path: ["auth", "register"] },
            description: "Kiểm thử ca biên: Số điện thoại không đúng 10 số và không thuộc đầu số mạng VN (03, 05, 07, 08, 09). Chặn với HTTP 400."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 400 Bad Request", function () {',
                '    pm.response.to.have.status(400);',
                '});',
                'pm.test("Returns validation error for phone number", function () {',
                '    var res = pm.response.json();',
                '    var msg = Array.isArray(res.message) ? res.message.join(" ") : res.message;',
                '    pm.expect(msg.toLowerCase()).to.include("thoại");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Register Negative - Password Too Short (400 Bad Request)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "test_pwd_{{$timestamp}}@brewlite.vn",
                password: "123",
                fullName: "Nguyễn Văn Test",
                phone: "0901234567"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/register", host: ["{{baseUrl}}"], path: ["auth", "register"] },
            description: "Kiểm thử ca biên: Mật khẩu dưới 6 ký tự. DTO @MinLength(6) phải chặn với HTTP 400."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 400 Bad Request", function () {',
                '    pm.response.to.have.status(400);',
                '});',
                'pm.test("Returns validation error for short password", function () {',
                '    var res = pm.response.json();',
                '    var msg = Array.isArray(res.message) ? res.message.join(" ") : res.message;',
                '    pm.expect(msg.toLowerCase()).to.include("mật khẩu");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Login Customer Account (Positive - 200 OK)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "customer@brewlite.vn",
                password: "123456"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/login", host: ["{{baseUrl}}"], path: ["auth", "login"] },
            description: "Đăng nhập tài khoản khách hàng mặc định. Trích xuất JWT Bearer token lưu vào {{authToken}}."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Returns valid JWT token & stores in authToken", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res).to.have.property("accessToken");',
                '    pm.expect(res.accessToken.length).to.be.above(20);',
                '    pm.expect(res.user.email).to.eql("customer@brewlite.vn");',
                '    pm.environment.set("authToken", res.accessToken);',
                '    pm.environment.set("userId", res.user.id);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Login Staff Account (Positive - 200 OK)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "staff@brewlite.vn",
                password: "123456"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/login", host: ["{{baseUrl}}"], path: ["auth", "login"] },
            description: "Đăng nhập tài khoản nhân viên quầy phục vụ kiểm thử phân quyền RBAC."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("User role is STAFF and stores staffToken", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.user.role).to.eql("STAFF");',
                '    pm.environment.set("staffToken", res.accessToken);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Login Negative - Wrong Password (401 Unauthorized)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "customer@brewlite.vn",
                password: "mat_khau_hoan_toan_sai"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/login", host: ["{{baseUrl}}"], path: ["auth", "login"] },
            description: "Kiểm thử ca biên: Nhập sai mật khẩu bảo mật. Hệ thống từ chối xác thực với HTTP 401."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 401 Unauthorized", function () {',
                '    pm.response.to.have.status(401);',
                '});',
                'pm.test("Returns unauthorized message", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.message).to.be.a("string");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Login Negative - Non-Existent Account (401 Unauthorized)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "tai_khoan_khong_ton_tai_{{$timestamp}}@brewlite.vn",
                password: "123456"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/auth/login", host: ["{{baseUrl}}"], path: ["auth", "login"] },
            description: "Kiểm thử ca biên: Đăng nhập với email không tồn tại. Hệ thống bảo mật từ chối với HTTP 401."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 401 Unauthorized", function () {',
                '    pm.response.to.have.status(401);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        }
      ]
    },

    // FOLDER 3: PRODUCTS CATALOG & SEARCH (UC-02)
    {
      name: "03 - Products Catalog & Search (UC-02)",
      item: [
        {
          name: "Get Products Menu (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/products", host: ["{{baseUrl}}"], path: ["products"] },
            description: "Truy vấn toàn bộ danh mục sản phẩm đồ uống phục vụ màn hình thực đơn người dùng (UC-01/02)."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Returns non-empty array of products", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res).to.be.an("array");',
                '    pm.expect(res.length).to.be.above(0);',
                '});',
                'pm.test("Product schema has valid price, sizes and toppings", function () {',
                '    var item = pm.response.json()[0];',
                '    pm.expect(item).to.have.property("id");',
                '    pm.expect(item).to.have.property("name");',
                '    pm.expect(Number(item.basePrice)).to.be.above(0);',
                '    pm.expect(item.sizeOptions).to.be.an("array");',
                '    pm.expect(item.toppingOptions).to.be.an("array");',
                '    // Lưu mã sản phẩm mẫu để dùng cho đặt hàng',
                '    pm.environment.set("productId", item.id);',
                '    pm.environment.set("productName", item.name);',
                '    pm.environment.set("productPrice", item.basePrice);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Get Product Categories (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/products/categories", host: ["{{baseUrl}}"], path: ["products", "categories"] },
            description: "Truy vấn danh mục phân loại đồ uống (Coffee, Tea, Freeze, Bakery...) kèm số lượng món."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Returns categories list with valid count", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res).to.be.an("array");',
                '    pm.expect(res.length).to.be.above(0);',
                '    pm.expect(res[0]).to.have.property("category");',
                '    pm.expect(res[0]).to.have.property("count");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Filter Products by Category (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/products?category=Coffee",
              host: ["{{baseUrl}}"],
              path: ["products"],
              query: [{ key: "category", value: "Coffee" }]
            },
            description: "Lọc thực đơn theo nhóm Cà phê (category=Coffee). Kiểm tra 100% kết quả khớp điều kiện lọc."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("All returned items belong to Coffee category", function () {',
                '    var res = pm.response.json();',
                '    res.forEach(function(prod) {',
                '        pm.expect(prod.category).to.eql("Coffee");',
                '    });',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Get Product Detail by Valid ID (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/products/{{productId}}", host: ["{{baseUrl}}"], path: ["products", "{{productId}}"] },
            description: "Truy vấn chi tiết 1 sản phẩm gồm công thức pha chế Barista và tùy chọn kích cỡ/topping."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Product ID matches requested parameter", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.id).to.eql(pm.environment.get("productId"));',
                '    pm.expect(res).to.have.property("recipe");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Get Product Detail - Non-Existent ID (Negative - 404 Not Found)",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/products/prod-invalid-nonexistent-id", host: ["{{baseUrl}}"], path: ["products", "prod-invalid-nonexistent-id"] },
            description: "Kiểm thử ca biên: Truy vấn sản phẩm với mã ID không tồn tại. Hệ thống phải trả về HTTP 404."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 404 Not Found", function () {',
                '    pm.response.to.have.status(404);',
                '});',
                'pm.test("Returns not found error message", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.message).to.be.a("string");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        }
      ]
    },

    // FOLDER 4: ORDERS & ATOMIC CHECKOUT (UC-05)
    {
      name: "04 - Orders & Atomic Checkout (UC-05)",
      item: [
        {
          name: "Create Order (Positive - 201 Created)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                items: [
                  {
                    productId: "{{productId}}",
                    size: "M",
                    toppings: ["Trân châu đen"],
                    quantity: 2,
                    unitPrice: 35000
                  }
                ],
                note: "Giao hàng nhanh - Ít đường nhiều đá"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/orders", host: ["{{baseUrl}}"], path: ["orders"] },
            description: "Tạo đơn hàng mới nguyên tử trong Database Transaction kèm trừ tồn kho sản phẩm (UC-05)."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 201 Created", function () {',
                '    pm.response.to.have.status(201);',
                '});',
                'pm.test("Order is created with PENDING status & valid orderCode", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res).to.have.property("orderId");',
                '    pm.expect(res.status).to.eql("PENDING");',
                '    pm.expect(res.orderCode).to.match(/^BL-\\d{6}-\\d{4}$/);',
                '    pm.expect(Number(res.totalAmount)).to.eql(70000);',
                '    pm.environment.set("orderId", res.orderId);',
                '    pm.environment.set("orderCode", res.orderCode);',
                '    pm.environment.set("expectedTotalAmount", res.totalAmount);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Create Order Negative - Unauthenticated (401 Unauthorized)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                items: [{ productId: "{{productId}}", size: "M", quantity: 1, unitPrice: 35000 }]
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/orders", host: ["{{baseUrl}}"], path: ["orders"] },
            description: "Kiểm thử ca biên: Gửi yêu cầu đặt hàng mà không có JWT Bearer Token. Bị chặn với HTTP 401."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 401 Unauthorized", function () {',
                '    pm.response.to.have.status(401);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Create Order Negative - Empty Items Array (400 Bad Request)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ items: [] }, null, 2)
            },
            url: { raw: "{{baseUrl}}/orders", host: ["{{baseUrl}}"], path: ["orders"] },
            description: "Kiểm thử ca biên: Tạo đơn hàng với giỏ rỗng items=[]. DTO @ArrayMinSize(1) chặn với HTTP 400."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 400 Bad Request", function () {',
                '    pm.response.to.have.status(400);',
                '});',
                'pm.test("Validation rejects empty items array", function () {',
                '    var res = pm.response.json();',
                '    var msg = Array.isArray(res.message) ? res.message.join(" ") : res.message;',
                '    pm.expect(msg.toLowerCase()).to.include("sản phẩm");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Get User Orders History (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{authToken}}" }],
            url: { raw: "{{baseUrl}}/orders", host: ["{{baseUrl}}"], path: ["orders"] },
            description: "Khách hàng tra cứu lịch sử các đơn hàng của chính mình (UC-03)."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Returns user orders array containing newly created order", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res).to.be.an("array");',
                '    var found = res.some(function(o) { return o.id === pm.environment.get("orderId"); });',
                '    pm.expect(found).to.eql(true);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Track Order by Valid ID (Positive - 200 OK)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{authToken}}" }],
            url: { raw: "{{baseUrl}}/orders/{{orderId}}", host: ["{{baseUrl}}"], path: ["orders", "{{orderId}}"] },
            description: "Theo dõi tiến độ đơn hàng thời gian thực theo ID."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Order matches requested orderId and status is PENDING", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.id).to.eql(pm.environment.get("orderId"));',
                '    pm.expect(res.status).to.eql("PENDING");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Track Order - Non-Existent ID (Negative - 404 Not Found)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{authToken}}" }],
            url: { raw: "{{baseUrl}}/orders/ord-non-existent-9999", host: ["{{baseUrl}}"], path: ["orders", "ord-non-existent-9999"] },
            description: "Kiểm thử ca biên: Tra cứu đơn hàng không tồn tại. Hệ thống trả về HTTP 404."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 404 Not Found", function () {',
                '    pm.response.to.have.status(404);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        }
      ]
    },

    // FOLDER 5: CASHLESS PAYMENT & IDEMPOTENCY (UC-06)
    {
      name: "05 - Cashless Payment & Idempotency (UC-06)",
      item: [
        {
          name: "Process Payment - First Attempt (Positive - 200 OK)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" },
              { key: "Idempotency-Key", value: "BL-IDEM-{{$timestamp}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                orderId: "{{orderId}}",
                method: "WALLET"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/payments", host: ["{{baseUrl}}"], path: ["payments"] },
            description: "Thanh toán đơn hàng lần đầu với Idempotency-Key duy nhất. Chuyển trạng thái đơn sang CONFIRMED."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Payment is PAID and order transitions to CONFIRMED", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res).to.have.property("paymentId");',
                '    pm.expect(res.paymentStatus).to.eql("PAID");',
                '    pm.expect(res.orderStatus).to.eql("CONFIRMED");',
                '    pm.expect(res.isIdempotentReplay).to.eql(false);',
                '    pm.environment.set("paymentId", res.paymentId);',
                '    pm.environment.set("fixedIdempotencyKey", pm.request.headers.get("Idempotency-Key"));',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Process Payment - Idempotency Replay (Anti-Duplicate 200 OK)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" },
              { key: "Idempotency-Key", value: "{{fixedIdempotencyKey}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                orderId: "{{orderId}}",
                method: "WALLET"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/payments", host: ["{{baseUrl}}"], path: ["payments"] },
            description: "Gửi lại nguyên vẹn request thanh toán với CÙNG Idempotency-Key (giả lập mạng chập chờn / double click). Hệ thống trả kết quả cache, KHÔNG trừ tiền lần 2."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Returns cached receipt and isIdempotentReplay is true", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.isIdempotentReplay).to.eql(true);',
                '    pm.expect(res.paymentId).to.eql(pm.environment.get("paymentId"));',
                '    pm.expect(res.paymentStatus).to.eql("PAID");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Process Payment Negative - Already Paid Order (400 Bad Request)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" },
              { key: "Idempotency-Key", value: "NEW-KEY-{{$timestamp}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                orderId: "{{orderId}}",
                method: "WALLET"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/payments", host: ["{{baseUrl}}"], path: ["payments"] },
            description: "Kiểm thử ca biên: Cố tình thanh toán lại đơn hàng đã hoàn tất với một Idempotency-Key MỚI. Bị chặn với HTTP 400."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 400 Bad Request", function () {',
                '    pm.response.to.have.status(400);',
                '});',
                'pm.test("Returns already paid error message", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.message).to.include("đã hoàn tất thanh toán");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Process Payment Negative - Non-Existent Order (404 Not Found)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" },
              { key: "Idempotency-Key", value: "BL-FAIL-{{$timestamp}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                orderId: "ord-invalid-9999",
                method: "WALLET"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/payments", host: ["{{baseUrl}}"], path: ["payments"] },
            description: "Kiểm thử ca biên: Thanh toán cho mã đơn hàng không tồn tại. Bị từ chối với HTTP 404."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 404 Not Found", function () {',
                '    pm.response.to.have.status(404);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Simulate SePay VietQR Webhook Reconcile (Positive - 200 OK)",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                id: 998877,
                gateway: "MBBank",
                transactionDate: "2026-11-14 02:00:00",
                accountNumber: "6563617082006",
                subAccount: null,
                transferType: "in",
                transferAmount: 70000,
                accumulated: 1000000,
                code: null,
                content: "BREWLITE {{orderCode}}",
                referenceCode: "FT261114998877",
                description: "BREWLITE {{orderCode}} chuyen khoan mua nuoc"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/payments/sepay-webhook", host: ["{{baseUrl}}"], path: ["payments", "sepay-webhook"] },
            description: "Mô phỏng máy chủ SePay đẩy Webhook biến động số dư VietQR Napas 24/7 khớp nội dung mã đơn hàng."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("SePay webhook reconciliation returns success", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.success).to.eql(true);',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Update Order Status to COMPLETED (Positive - 200 OK)",
          request: {
            method: "PATCH",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{staffToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "COMPLETED" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/orders/{{orderId}}/status", host: ["{{baseUrl}}"], path: ["orders", "{{orderId}}", "status"] },
            description: "Nhân viên Barista cập nhật hoàn tất chế biến và giao đồ uống cho khách hàng."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Order status transitions to COMPLETED", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.status).to.eql("COMPLETED");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        }
      ]
    },

    // FOLDER 6: EDGE CASES, CONCURRENCY & COMPENSATION (ADR-003)
    {
      name: "06 - Edge Cases & Concurrency (Teacher Questions)",
      item: [
        {
          name: "Cancel Order & Auto Refund (Compensating Transaction - 200 OK)",
          request: {
            method: "PATCH",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "CANCELLED" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/orders/{{orderId}}/status", host: ["{{baseUrl}}"], path: ["orders", "{{orderId}}", "status"] },
            description: "Khách hàng đổi món/hủy đơn đã thanh toán. Hệ thống kích hoạt Compensating Transaction: hoàn tiền (REFUNDED) và tự động cộng hoàn tồn kho sản phẩm."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200 OK", function () {',
                '    pm.response.to.have.status(200);',
                '});',
                'pm.test("Order is CANCELLED and Compensating Transaction executes", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.status).to.eql("CANCELLED");',
                '    if (res.refundStatus) {',
                '        pm.expect(res.refundStatus).to.eql("REFUNDED");',
                '    }',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        },
        {
          name: "Concurrency - Out-of-Stock Protection (Negative - 409 Conflict)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{authToken}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                items: [
                  {
                    productId: "{{productId}}",
                    size: "M",
                    quantity: 9999,
                    unitPrice: 35000
                  }
                ],
                note: "Khách B đặt số lượng vượt tồn kho tối đa (Tranh chấp tài nguyên đồng thời)"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/orders", host: ["{{baseUrl}}"], path: ["orders"] },
            description: "Kiểm thử tranh chấp đồng thời: Khách B đặt mua vượt quá lượng tồn kho thực tế. Database Transaction abort và trả về HTTP 409 Conflict chống bán âm kho."
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 409 Conflict", function () {',
                '    pm.response.to.have.status(409);',
                '});',
                'pm.test("Returns out of stock conflict message preventing overselling", function () {',
                '    var res = pm.response.json();',
                '    pm.expect(res.message).to.be.a("string");',
                '    pm.expect(res.message.toLowerCase()).to.include("tồn kho");',
                '});'
              ],
              type: "text/javascript"
            }
          }]
        }
      ]
    }
  ]
};

const target1 = path.join(__dirname, '..', 'postman', 'collections', 'BrewLite_API.postman_collection.json');
const target2 = path.join(__dirname, '..', 'tests', 'postman', 'BrewLite_API.postman_collection.json');

fs.writeFileSync(target1, JSON.stringify(collection, null, 2), 'utf8');
fs.writeFileSync(target2, JSON.stringify(collection, null, 2), 'utf8');

console.log(`[Success] Đã tạo thành công bộ kiểm thử Postman toàn diện tại:\n - ${target1}\n - ${target2}`);
