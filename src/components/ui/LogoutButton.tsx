'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className ?? 'flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50'}
    >
      <LogOut className="w-4 h-4" />
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  );
}
