'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const P = '#ec5b13';

interface QrCodeDisplayProps {
  vendorName: string;
  menuUrl: string;
  cnpj?: string | null;
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

  return (
    <div className="space-y-4">
      {/* QR Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-slate-50">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: P }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm7-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2z"/>
            </svg>
          </div>
          <h2 className="font-bold text-slate-900 text-lg">{vendorName}</h2>
          {cnpj && (
            <p className="text-xs text-slate-400 mt-1">CNPJ {cnpj}</p>
          )}
          <p className="text-sm text-slate-500 mt-2">
            Imprima e cole na barraca — o cliente escaneia e já vê o cardápio
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center py-6 bg-white">
          <div className="p-4 border-2 rounded-2xl" style={{ borderColor: P + '30' }}>
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>

        {/* URL */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-xs text-slate-500 truncate flex-1">{menuUrl}</p>
            <button onClick={copyLink} className="flex-shrink-0 text-xs font-semibold transition" style={{ color: copied ? '#22c55e' : P }}>
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
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

      {/* Tip card */}
      <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex gap-3">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-slate-500 leading-relaxed">
          Para identificar a mesa, adicione <span className="font-semibold text-slate-700">?mesa=1</span> no final da URL.
          Ex: <span className="font-semibold text-slate-700">.../menu/{'{id}'}?mesa=1</span>
        </p>
      </div>
    </div>
  );
}
