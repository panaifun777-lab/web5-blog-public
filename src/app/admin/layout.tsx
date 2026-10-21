// ════════════════════════════════════════════════════════════════
// src/app/admin/layout.tsx — Admin Layout
// Protected by superadmin wallet signature
// ════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Web5.blog',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {children}
    </div>
  );
}
