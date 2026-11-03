'use client';

/**
 * @file login/page.tsx
 * @description Màn hình Đăng nhập, Đăng ký tài khoản và Quản lý Hồ sơ thành viên (UC-04)
 * @author Thành viên Phụ 2 - Business Analyst 2 (SRS & Use-case Lead)
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, UserPlus, LogOut, ShieldCheck, User } from 'lucide-react';
import { apiFetch, getStoredUser, setStoredToken, setStoredUser, removeStoredToken } from '../../lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const handleQuickFill = (role: 'customer' | 'staff') => {
    if (role === 'customer') {
      setEmail('customer@brewlite.vn');
      setPassword('123456');
    } else {
      setEmail('staff@brewlite.vn');
      setPassword('123456');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await apiFetch<any>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, fullName, phone }),
        });
        setStoredToken(res.accessToken);
        setStoredUser(res.user);
        router.push(redirectUrl);
      } else {
        const res = await apiFetch<any>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setStoredToken(res.accessToken);
        setStoredUser(res.user);
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Xác thực thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    router.push('/');
  };

  // If already logged in: Profile View
  if (currentUser) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl mx-auto shadow-inner">
            {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{currentUser.fullName}</h2>
            <p className="text-xs text-slate-500">{currentUser.email}</p>
          </div>
          <div className="inline-block bg-teal-50 text-teal-800 text-xs px-3 py-1 rounded-full font-mono font-semibold">
            Vai trò: {currentUser.role}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-around text-center text-xs">
            <div>
              <span className="block text-slate-400 text-[10px]">Điểm tích lũy</span>
              <span className="font-extrabold text-teal-700 text-sm">
                {currentUser.loyaltyPoints || 0} pts
              </span>
            </div>
            <div>
              <span className="block text-slate-400 text-[10px]">Hạng thành viên</span>
              <span className="font-bold text-slate-700">Gold Member</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs py-3 rounded-xl border border-rose-200 flex items-center justify-center space-x-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Quick Credentials Panel for Evaluators / Teachers */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Tài khoản thử nghiệm nhanh (Nghiệm thu Tuần 9):</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('customer')}
            className="bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300 rounded-lg p-2 text-left text-[11px] transition"
          >
            <span className="font-bold block">1-Chạm: Khách hàng</span>
            <span className="text-[10px] text-amber-700 block truncate">customer@brewlite.vn</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('staff')}
            className="bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300 rounded-lg p-2 text-left text-[11px] transition"
          >
            <span className="font-bold block">1-Chạm: Nhân viên quầy</span>
            <span className="text-[10px] text-amber-700 block truncate">staff@brewlite.vn</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setIsRegister(false);
            setError(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            !isRegister ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegister(true);
            setError(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            isRegister ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Đăng ký mới
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        {isRegister && (
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Họ và tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Địa chỉ Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@brewlite.vn"
            required
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        {isRegister && (
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-3 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập ngay'}
        </button>
      </form>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Đang tải biểu mẫu...</div>}>
      <LoginForm />
    </Suspense>
  );
}
