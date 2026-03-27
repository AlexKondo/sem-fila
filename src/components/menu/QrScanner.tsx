'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const P = '#ec5b13'; // primary
const SCAN_INTERVAL = 200; // ms entre scans

export default function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const scanningRef = useRef(false);
  const activeRef = useRef(true); // controla se o scan loop deve continuar

  const [error, setError] = useState('');
  const [detected, setDetected] = useState('');
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Inicializa o Web Worker uma vez
  useEffect(() => {
    workerRef.current = new Worker('/qr-worker.js');
    return () => { workerRef.current?.terminate(); };
  }, []);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const scheduleNextScan = useCallback(() => {
    if (!activeRef.current) return;
    setTimeout(() => {
      if (!activeRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        scheduleNextScan();
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { scheduleNextScan(); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Envia para o Worker — main thread fica livre para interações
      if (workerRef.current && !scanningRef.current) {
        scanningRef.current = true;
        workerRef.current.onmessage = (e) => {
          scanningRef.current = false;
          if (e.data) {
            // QR detectado!
            activeRef.current = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            setDetected(e.data);
            try {
              const parsed = new URL(e.data);
              if (parsed.pathname.startsWith('/menu/')) {
                router.push(parsed.pathname + parsed.search);
                return;
              }
            } catch {}
          } else {
            scheduleNextScan();
          }
        };
        workerRef.current.postMessage({
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        });
      } else {
        scheduleNextScan();
      }
    }, SCAN_INTERVAL);
  }, [router]);

  const startCamera = useCallback(async () => {
    setError('');
    activeRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const cap = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if (cap.torch) setTorchSupported(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.addEventListener('loadedmetadata', () => {
          scheduleNextScan();
        });
      }
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  }, [scheduleNextScan]);

  useEffect(() => { startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch;
    await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
    setTorch(next);
  }

  const [isManualOpen, setIsManualOpen] = useState(false);

  // Para liberar CPU durante a digitação no modal manual
  useEffect(() => {
    if (isManualOpen) {
      stopCamera();
    } else if (!detected) {
      startCamera();
    }
  }, [isManualOpen, detected, stopCamera, startCamera]);

  return (
    <div className="relative flex min-h-screen flex-col" style={{ backgroundColor: '#f8f6f6' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: P }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm7-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">QuickPick</h1>
        </div>
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6 pt-8">
        {error ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Câmera bloqueada</h2>
              <p className="text-slate-600 font-medium">{error}</p>
            </div>
            <button
              onClick={startCamera}
              className="w-full max-w-sm py-4 rounded-xl font-bold text-white shadow-lg"
              style={{ backgroundColor: P }}
            >
              Tentar novamente
            </button>
          </>
        ) : detected ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">QR Code detectado!</h2>
              <p className="text-slate-600 font-medium">Redirecionando para o cardápio…</p>
            </div>
            <a
              href={detected}
              className="w-full max-w-sm py-4 rounded-xl font-bold text-white text-center shadow-lg block"
              style={{ backgroundColor: P }}
            >
              Abrir cardápio
            </a>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Bem-vindo!</h2>
              <p className="text-slate-600 font-medium">Aponte a câmera para o código QR para fazer seu pedido</p>
            </div>

            {/* Scanner viewfinder — exatamente como o asset */}
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: P }} />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: P }} />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: P }} />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: P }} />

              {/* Camera area */}
              <div className="w-[85%] h-[85%] bg-slate-200 rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scan line */}
                <div
                  className="absolute left-0 w-full h-1 animate-scan"
                  style={{ backgroundColor: P, boxShadow: `0 0 15px rgba(236,91,19,0.8)`, opacity: 0.7 }}
                />
              </div>

              {/* Flash & Gallery controls */}
              <div className="absolute -bottom-6 flex gap-4">
                {torchSupported && (
                  <button
                    onClick={toggleTorch}
                    className="bg-white p-3 rounded-full shadow-lg border border-slate-100"
                  >
                    <svg className="w-5 h-5" style={{ color: torch ? P : '#64748b' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 2h10l-2 7h3l-8 13 2-8H9z"/>
                    </svg>
                  </button>
                )}
                <button className="bg-white p-3 rounded-full shadow-lg border border-slate-100">
                  <svg className="w-5 h-5" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Manual entry */}
            <div className="mt-16 w-full max-w-sm">
              <button 
                onClick={() => setIsManualOpen(true)}
                className="w-full py-4 px-6 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-3 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Digitar código manualmente
              </button>
            </div>

            {/* Custom Manual Code Modal */}
            {isManualOpen && (
              <ManualEntryModal 
                onClose={() => setIsManualOpen(false)} 
                onConfirm={(code) => router.push(`/menu/${code.trim()}`)} 
                P={P}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-slate-200 pb-8 pt-2">
        <div className="flex justify-around items-center px-4">
          <Link className="flex flex-col items-center gap-1 p-2" style={{ color: P }} href="/">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-xs font-semibold">Início</span>
          </Link>
          <Link href="/order" className="flex flex-col items-center gap-1 p-2 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-semibold">Pedidos</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 p-2 text-slate-400" href="/profile?edit=true">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-semibold">Ajustes</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

function ManualEntryModal({ onClose, onConfirm, P }: { onClose: () => void; onConfirm: (code: string) => void; P: string }) {
  const [manualCode, setManualCode] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Digitar Código</h3>
        <p className="text-xs text-slate-500">Insira o código numérico fixado na sua mesa ou quiosque:</p>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Ex: 502"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex gap-2">
          <button 
            onClick={onClose} 
            className="flex-1 bg-slate-100 py-3 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { if (manualCode) onConfirm(manualCode); }} 
            style={{ backgroundColor: P }} 
            className="flex-1 text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition"
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
