/**
 * @file format.ts
 * @description Hàm tiện ích định dạng tiền tệ dùng chung cho các màn hình Frontend.
 * @author Thành viên Chính 3 - Frontend & PWA Lead
 */

/** 35000 → "35.000 đ" */
export function formatVND(amount: number | string): string {
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
}
