'use client';

/**
 * @file VietQRModal.tsx
 * @description Modal Cổng thanh toán chuyển khoản ngân hàng VietQR & Ví điện tử (FR-06)
 *              Đồng bộ 100% tài khoản thụ hưởng & Webhook SePay Napas 247 với Assignment 1:
 *              - Ngân hàng Quân Đội (MBBank)
 *              - Số tài khoản: 6563617082006
 *              - Chủ tài khoản: TRAN LE MINH TAM (Kỹ sư Trưởng / Chính 1)
 *              - Tự động bắt Webhook SePay IPN và cập nhật tức thì (Auto-Polling 1.5s)
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  CreditCard,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { formatVND } from '../lib/format';
import { apiFetch } from '../lib/api';

interface VietQRModalProps {
  isOpen: boolean;
  orderId: string;
  orderCode: string;
  amount: number;
  method?: 'WALLET' | 'CARD';
  onClose: () => void;
  onConfirmPayment: () => Promise<void>;
  onPaymentSuccess?: () => void;
  onCancelOrder?: () => Promise<void> | void;
  submitting: boolean;
}

export const VietQRModal: React.FC<VietQRModalProps> = ({
  isOpen,
  orderId,
  orderCode,
  amount,
  onClose,
  onConfirmPayment,
  onPaymentSuccess,
  onCancelOrder,
  submitting,
}) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 phút đếm ngược
  const [copiedField, setCopiedField] = useState<'STK' | 'CODE' | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [autoPaid, setAutoPaid] = useState(false);

  const callbacksRef = useRef({ onConfirmPayment, onPaymentSuccess });
  callbacksRef.current = { onConfirmPayment, onPaymentSuccess };

  const bankName = 'MBBank - Ngân hàng TMCP Quân Đội';
  const accountNumber = '6563617082006';
  const accountHolder = 'TRAN LE MINH TAM';
  const transferContent = `BREWLITE ${orderCode}`;

  const qrUrl = `https://img.vietqr.io/image/MB-6563617082006-compact2.png?amount=${Math.round(
    amount,
  )}&addInfo=BREWLITE${orderCode}&accountName=TRAN%20LE%20MINH%20TAM`;

  // Đồng hồ đếm ngược 10 phút
  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(600);
    setAutoPaid(false);
    setPollCount(0);
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Tự động kiểm tra trạng thái đơn hàng mỗi 1.5 giây (Lắng nghe Webhook SePay Napas 247)
  useEffect(() => {
    if (!isOpen || !orderId || autoPaid) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!isMounted) return;
      try {
        setPollCount((prev) => prev + 1);
        const order = await apiFetch<any>(`/orders/${orderId}`);
        if (
          order &&
          (order.status === 'CONFIRMED' ||
            order.status === 'COMPLETED' ||
            order.status === 'PAID')
        ) {
          if (!isMounted) return;
          setAutoPaid(true);
          clearInterval(interval);
          setTimeout(async () => {
            if (callbacksRef.current.onPaymentSuccess) {
              callbacksRef.current.onPaymentSuccess();
            } else {
              await callbacksRef.current.onConfirmPayment();
            }
          }, 1200);
        }
      } catch (err) {
        // Tiếp tục polling ở chu kỳ tiếp theo
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, orderId, autoPaid]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const copyToClipboard = (text: string, field: 'STK' | 'CODE') => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1f1612] text-[#f7f3ee] border border-[#3d2c23] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2c1810] via-[#5a371b] to-[#7e4d26] text-white flex items-center justify-between shrink-0 border-b border-[#4d3224]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span>Thanh Toán Chuyển Khoản VietQR (Napas 247)</span>
              </h3>
              <p className="text-xs text-amber-200/80">Quét mã QR qua ứng dụng MBBank hoặc ngân hàng bất kỳ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-full bg-black/25 hover:bg-black/50 text-white/80 transition"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Trạng thái SePay Webhook tự động nhận tiền thành công */}
          {autoPaid ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-3 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white">Đã nhận được tiền!</h3>
              <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>SePay Webhook đã tự động xác nhận giao dịch thành công</span>
              </p>
              <p className="text-[11px] text-stone-400">Đang hoàn tất và chuyển tới danh sách đơn hàng...</p>
            </div>
          ) : (
            <>
              {/* Tóm tắt tiền */}
              <div className="bg-[#2a1d17] border border-[#4a3429] rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 block">Mã đơn hàng</span>
                  <span className="text-sm font-extrabold text-amber-300">#{orderCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Số tiền cần thanh toán</span>
                  <span className="text-lg font-black text-amber-400">{formatVND(amount)}</span>
                </div>
              </div>

              {/* SePay Webhook Auto-detection Status Badge */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                  <span className="font-semibold">Đang đợi tiền vào tài khoản...</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 font-mono text-amber-200">
                  {pollCount > 0 ? `SePay Dò #${pollCount}` : 'Chờ quét QR'}
                </span>
              </div>

              {/* QR Code Container */}
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner text-stone-900 border border-stone-200">
                <div className="relative p-2 bg-white rounded-xl shadow-sm border border-stone-100 flex flex-col items-center">
                  <img
                    src={qrUrl}
                    alt="VietQR MBBank TRAN LE MINH TAM"
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg"
                  />
                  <div className="mt-2 text-center">
                    <span className="text-[11px] font-bold tracking-wider text-stone-600 uppercase flex items-center justify-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-stone-700" /> Quét bằng App Ngân Hàng hoặc Ví
                    </span>
                  </div>
                </div>
              </div>

              {/* Chi tiết tài khoản ngân hàng */}
              <div className="bg-[#2a1d17] border border-[#4a3429] rounded-2xl p-3.5 space-y-2.5 text-xs text-stone-300">
                <div className="flex justify-between items-center py-1 border-b border-[#3d2c23]">
                  <span className="text-stone-400">Ngân hàng</span>
                  <span className="font-bold text-white text-right">{bankName}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#3d2c23]">
                  <span className="text-stone-400">Chủ tài khoản</span>
                  <span className="font-bold text-amber-300 tracking-wide uppercase">{accountHolder}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#3d2c23]">
                  <span className="text-stone-400">Số tài khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(accountNumber, 'STK')}
                      className="p-1 rounded bg-[#3d2c23] hover:bg-[#5a371b] text-amber-300 transition"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'STK' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-400">Nội dung chuyển khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-sm">{transferContent}</span>
                    <button
                      onClick={() => copyToClipboard(transferContent, 'CODE')}
                      className="p-1 rounded bg-[#3d2c23] hover:bg-[#5a371b] text-amber-300 transition"
                      title="Sao chép nội dung"
                    >
                      {copiedField === 'CODE' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Đồng hồ đếm ngược */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Mã QR có hiệu lực trong:</span>
                <span className="font-mono font-bold text-amber-400">{timeFormatted}</span>
              </div>

              {/* Trạng thái tự động lắng nghe SePay Webhook (Không cần bấm nút xác nhận) */}
              <div className="w-full p-4 rounded-2xl bg-[#2a1d17] border border-amber-500/30 text-center space-y-2 shadow-inner">
                <div className="flex items-center justify-center gap-2 text-amber-300 text-xs font-bold">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Đang tự động xác thực giao dịch từ App Ngân Hàng...</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Vui lòng quét mã QR ở trên bằng App ngân hàng bất kỳ. Ngay khi tiền vào tài khoản MBBank, hệ thống SePay sẽ tự động đối soát và hoàn tất đơn hàng ngay lập tức.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#3d2c23] bg-[#1a120e] flex items-center justify-between text-[11px] text-stone-500 shrink-0">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SePay Webhook Napas 24/7 & TLS 256-bit</span>
          </div>
          <button
            onClick={async () => {
              if (onCancelOrder) {
                await onCancelOrder();
              } else {
                onClose();
              }
            }}
            disabled={submitting}
            className="text-stone-400 hover:text-white transition cursor-pointer"
          >
            Quay lại sửa đơn
          </button>
        </div>
      </div>
    </div>
  );
};
