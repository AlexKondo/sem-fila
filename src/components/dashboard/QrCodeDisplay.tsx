'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Copy } from 'lucide-react';

interface QrCodeDisplayProps {
  vendorName: string;
  menuUrl: string;
}

export default function QrCodeDisplay({ vendorName, menuUrl }: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, menuUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#1f2937', light: '#ffffff' },
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
    alert('Link copiado!');
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col items-center gap-5">
      <div>
        <h2 className="text-center font-bold text-gray-900 text-lg">{vendorName}</h2>
        <p className="text-center text-sm text-gray-500 mt-1">
          Imprima e cole na barraca para os clientes escaneirem
        </p>
      </div>

      {/* QR Code */}
      <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl">
        <canvas ref={canvasRef} />
      </div>

      {/* URL */}
      <div className="w-full bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
        <p className="text-xs text-gray-500 truncate flex-1">{menuUrl}</p>
        <button onClick={copyLink} className="text-gray-400 hover:text-orange-500 flex-shrink-0">
          <Copy className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={download}
        className="w-full bg-orange-500 text-white font-semibold py-3 rounded-2xl hover:bg-orange-600 transition flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        Baixar QR Code (PNG)
      </button>

      <p className="text-xs text-gray-400 text-center">
        Dica: para adicionar o número da mesa, use a URL com ?mesa=1
      </p>
    </div>
  );
}
