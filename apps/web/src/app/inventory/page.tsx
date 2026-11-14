'use client';

/**
 * @file inventory/page.tsx
 * @description Điều hướng nhanh tới Trang Kho Nguyên Liệu & Công Thức BOM Quầy Barista
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/barista?tab=inventory');
  }, [router]);

  return (
    <div className="bg-[#faf7f2] min-h-[60vh] flex items-center justify-center text-center p-6">
      <div className="animate-pulse space-y-2">
        <div className="w-10 h-10 border-4 border-[#7e4d26] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-stone-600">Đang chuyển hướng tới Kho Nguyên Liệu & BOM...</p>
      </div>
    </div>
  );
}
