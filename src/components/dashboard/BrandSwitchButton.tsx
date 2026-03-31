'use client';

interface Props {
  vendorId: string;
}

export default function BrandSwitchButton({ vendorId }: Props) {
  function handleSwitch() {
    document.cookie = `selected_vendor_id=${vendorId}; path=/; max-age=86400`;
    window.location.reload();
  }

  return (
    <button
      onClick={handleSwitch}
      className="mt-3 w-full text-xs font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-orange-300 hover:text-orange-600 transition"
    >
      Gerenciar esta marca →
    </button>
  );
}
