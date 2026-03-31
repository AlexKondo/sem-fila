'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const P = '#ec5b13';

interface QrCodeDisplayProps {
  vendorName: string;
  menuUrl: string;
  cnpj?: string | null;
}

function getNumericCode(uuid: string): string {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash << 5) - hash + uuid.charCodeAt(i);
    hash |= 0; // Converte para inteiro de 32 bits
  }
  const num = Math.abs(hash) % 1000000; // Máximo 6 dígitos
  return num.toString().padStart(6, '0').replace(/(\d{3})(\d{3})/, '$1.$2');
}

export default function QrCodeDisplay({ vendorName, menuUrl, cnpj }: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, menuUrl, {
        width: 260,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });
    }
  }, [menuUrl]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `quickpick-${vendorName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function copyLink() {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const vendorId = menuUrl.split('/').pop() || '';
  const code = getNumericCode(vendorId);
  const parts = vendorName.split(' - ');
  const displayTitle = parts.length > 1
    ? <>{parts[0]} <span style={{ color: P }}>{code}</span> – {parts.slice(1).join(' - ')}</>
    : <>{vendorName} <span style={{ color: P }}>{code}</span></>;

  return (
    <div className="space-y-4">
      {/* QR Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-slate-50 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: P }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm7-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2z"/>
            </svg>
          </div>
          <h2 className="font-bold text-slate-900 dark:text-white text-lg">{displayTitle}</h2>
          {cnpj && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">CNPJ {cnpj}</p>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Imprima e cole na barraca — o cliente escaneia e já vê o cardápio
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center py-6 bg-white dark:bg-slate-950 rounded-xl mx-6 my-2">
          <div className="p-4 border-2 rounded-2xl bg-white shadow-sm" style={{ borderColor: P + '30' }}>
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>

        {/* URL */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex flex-col items-center justify-center border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-3 bg-slate-50 dark:bg-slate-950">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Código do Quiosque</span>
            <p className="text-2xl font-black text-slate-800 dark:text-white tracking-wider mt-0.5" style={{ letterSpacing: '2px' }}>
              {getNumericCode(vendorId)}
            </p>
          </div>

          <button
            onClick={download}
            className="w-full h-12 font-bold rounded-xl text-white flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ backgroundColor: P, boxShadow: `0 4px 15px ${P}40` }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Baixar QR Code (PNG)
          </button>
        </div>
      </div>
    </div>
  );
}
