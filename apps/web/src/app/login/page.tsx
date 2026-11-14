'use client';

/**
 * @file login/page.tsx
 * @description Màn hình Đăng nhập, Đăng ký thành viên BrewLite Roastery (UC-04)
 *              - Thiết kế thương mại chuẩn mực, sang trọng
 *              - Loại bỏ hoàn toàn các khung thử nghiệm thô kệch
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, Eye, EyeOff, CheckCircle2, AlertCircle, Coffee, ShieldCheck } from 'lucide-react';
import { apiFetch, getStoredUser, setStoredToken, setStoredUser, removeStoredToken } from '../../lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRegister, setIsRegister] = useState(false);

  // Form states - Mặc định để trống hoàn toàn như website thương mại thực tế
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const validateForm = (): boolean => {
    setError(null);
    setSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Định dạng email không hợp lệ (Ví dụ: name@brewlite.vn).');
      return false;
    }

    if (password.length < 6) {
      setError('Mật khẩu bảo mật phải có độ dài tối thiểu từ 6 ký tự trở lên.');
      return false;
    }

    if (isRegister) {
      const nameRegex = /^[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9\s']{2,50}$/;
      if (!fullName.trim() || !nameRegex.test(fullName.trim())) {
        setError('Họ và tên không hợp lệ. Vui lòng nhập họ tên thật (từ 2 đến 50 ký tự, không chứa chữ số).');
        return false;
      }

      if (phone.trim()) {
        const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
        if (!phoneRegex.test(phone.trim())) {
          setError('Số điện thoại không hợp lệ. Yêu cầu 10 chữ số theo chuẩn mạng viễn thông Việt Nam (03, 05, 07, 08, 09).');
          return false;
        }
      }

      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isRegister) {
        const res = await apiFetch<any>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            phone: phone.trim() || undefined,
          }),
        });
        setStoredToken(res.accessToken);
        setStoredUser(res.user);
        setCurrentUser(res.user);
        setSuccess('Đăng ký tài khoản thành công!');
        setTimeout(() => router.push(redirectUrl), 1000);
      } else {
        const res = await apiFetch<any>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        });
        setStoredToken(res.accessToken);
        setStoredUser(res.user);
        setCurrentUser(res.user);
        setSuccess('Đăng nhập thành công!');
        setTimeout(() => router.push(redirectUrl), 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Xác thực không thành công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    setSuccess('Đã đăng xuất tài khoản an toàn.');
  };

  // Nếu người dùng đã đăng nhập: hiển thị Profile thẻ thành viên
  if (currentUser) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-amber-900/10 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#faf3ea] text-[#7e4d26] rounded-2xl mx-auto flex items-center justify-center text-2xl font-black shadow-inner">
            {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
          </div>
          <h2 className="text-xl font-extrabold text-stone-900">{currentUser.fullName || 'Khách hàng'}</h2>
          <p className="text-xs text-stone-500">{currentUser.email}</p>
          <span className="inline-block bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
            Vai trò: {currentUser.role === 'STAFF' ? 'Nhân viên quầy' : currentUser.role === 'MANAGER' ? 'Quản lý' : 'Thành viên'}
          </span>
        </div>

        <div className="bg-[#faf7f2] rounded-2xl p-4 border border-amber-900/10 grid grid-cols-2 gap-4 text-center">
          <div>
            <span className="block text-stone-400 text-xs">Điểm tích lũy</span>
            <span className="text-xl font-extrabold text-[#7e4d26]">{currentUser.loyaltyPoints || 0} pts</span>
          </div>
          <div>
            <span className="block text-stone-400 text-xs">Hạng thành viên</span>
            <span className="text-base font-extrabold text-amber-700">Gold Member</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-3.5 rounded-2xl border border-rose-200 flex items-center justify-center space-x-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Tiêu đề & Logo */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 bg-gradient-to-br from-[#7e4d26] to-[#4a2c11] text-white rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-md">
          ☕
        </div>
        <h1 className="text-2xl font-extrabold text-stone-900 pt-2">
          {isRegister ? 'Tạo tài khoản thành viên' : 'Đăng nhập BrewLite'}
        </h1>
        <p className="text-xs text-stone-500">
          Tích điểm thưởng sau mỗi ly đồ uống & nhận ưu đãi độc quyền
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-100 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setIsRegister(false);
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition ${
            !isRegister ? 'bg-white text-[#7e4d26] shadow-xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegister(true);
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition ${
            isRegister ? 'bg-white text-[#7e4d26] shadow-xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Đăng ký mới
        </button>
      </div>

      {/* Thông báo thành công */}
      {success && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-2xl border border-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-2xl border border-rose-200 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form đăng nhập / đăng ký */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-900/10 shadow-sm space-y-4">
        {isRegister && (
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1.5">Họ và tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] focus:bg-white transition"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1.5">Địa chỉ Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] focus:bg-white transition"
          />
        </div>

        {isRegister && (
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1.5">Số điện thoại</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] focus:bg-white transition"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1.5">Mật khẩu</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-4 pr-11 py-3 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isRegister && (
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1.5">Xác nhận mật khẩu</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#7e4d26] focus:bg-white transition"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#7e4d26] hover:bg-[#5e361b] text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md transition disabled:bg-stone-300"
        >
          {loading ? 'Đang xác thực...' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Đang tải biểu mẫu...</div>}>
      <LoginForm />
    </Suspense>
  );
}
