'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/ui/BottomNav';
import ThemeToggle from '@/components/ui/ThemeToggle';

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
  const [isMyQrOpen, setIsMyQrOpen] = useState(false);
  const [recentVendors, setRecentVendors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('orders')
        .select('vendor_id, vendors(id, name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (!data) return;
      const seen = new Set<string>();
      const unique: { id: string; name: string }[] = [];
      for (const row of data) {
        const v = row.vendors as any;
        const vid = row.vendor_id as string;
        if (v?.name && !seen.has(vid)) {
          seen.add(vid);
          unique.push({ id: vid, name: v.name });
          if (unique.length === 5) break;
        }
      }
      setRecentVendors(unique);
    })();
  }, []);

  // Para liberar CPU durante a digitação no modal manual ou meu QR
  useEffect(() => {
    if (isManualOpen || isMyQrOpen) {
      stopCamera();
    } else if (!detected) {
      startCamera();
    }
  }, [isManualOpen, isMyQrOpen, detected, stopCamera, startCamera]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f8f6f6] dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: P }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm7-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm10 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm0-4h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 2h2v2h-2v-2z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">QuickPick</h1>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6 pt-8 pb-24">
        {error ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Câmera bloqueada</h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium">{error}</p>
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
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">QR Code detectado!</h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Redirecionando para o cardápio…</p>
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
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Bem-vindo!</h2>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Aponte a câmera para o código QR para fazer seu pedido</p>
            </div>

            {/* Botão Meu QR Code */}
            <button
              onClick={() => setIsMyQrOpen(true)}
              className="mb-6 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 border-2 border-dashed"
              style={{ borderColor: P, color: P }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Meu QR Code
            </button>

            {/* Scanner viewfinder — exatamente como o asset */}
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: P }} />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: P }} />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: P }} />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: P }} />

              {/* Camera area */}
              <div className="w-[85%] h-[85%] bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
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

            {/* Manual entry + histórico */}
            <div className="mt-16 w-full max-w-sm space-y-2">
              <button
                onClick={() => setIsManualOpen(true)}
                className="w-full py-4 px-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Digitar código manualmente
              </button>

              {recentVendors.length > 0 && (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">
                    Visitados recentemente
                  </p>
                  {recentVendors.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => router.push(`/menu/${v.id}`)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        i < recentVendors.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${P}20` }}>
                        <svg className="w-4 h-4" style={{ color: P }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{v.name}</span>
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Manual Code Modal */}
            {isManualOpen && (
              <ManualEntryModal
                onClose={() => setIsManualOpen(false)}
                onConfirm={(code) => router.push(`/menu/${code.trim()}`)}
                P={P}
              />
            )}

            {/* Meu QR Code Modal */}
            {isMyQrOpen && (
              <MyQrCodeModal
                onClose={() => setIsMyQrOpen(false)}
                P={P}
              />
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function MyQrCodeModal({ onClose, P }: { onClose: () => void; P: string }) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Não está logado — redireciona para login
        router.push('/login?redirect=/scan');
        return;
      }

      // Busca nome do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (cancelled) return;
      setUserName(profile?.name || user.email || '');

      // Gera QR Code com o user ID
      const QRCode = (await import('qrcode')).default;
      const qrPayload = JSON.stringify({ type: 'customer', id: user.id });
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 280,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });

      if (cancelled) return;
      setQrDataUrl(dataUrl);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Meu QR Code</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-orange-500 rounded-full animate-spin" style={{ borderTopColor: P }} />
            <p className="text-sm text-slate-500">Carregando...</p>
          </div>
        ) : (
          <>
            {userName && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                <span className="font-bold text-slate-900 dark:text-white">{userName}</span>
              </p>
            )}
            {qrDataUrl && (
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                  <img src={qrDataUrl} alt="Meu QR Code" className="w-56 h-56" />
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 leading-relaxed">
              Apresente este QR Code ao fornecedor para que ele registre seus pedidos diretamente na sua conta.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ManualEntryModal({ onClose, onConfirm, P }: { onClose: () => void; onConfirm: (code: string) => void; P: string }) {
  const [manualCode, setManualCode] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Digitar Código</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Insira o código numérico fixado na sua mesa ou quiosque:</p>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Ex: 502"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-900 dark:text-white"
        />
        <div className="flex gap-2">
          <button 
            onClick={onClose} 
            className="flex-1 bg-slate-100 dark:bg-slate-700 py-3 rounded-xl text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition"
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
