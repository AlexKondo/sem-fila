'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { X, Flashlight, FlashlightOff } from 'lucide-react';
import Link from 'next/link';

export default function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [error, setError] = useState('');
  const [detected, setDetected] = useState('');
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      // Verifica suporte a torch (lanterna)
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if (capabilities.torch) setTorchSupported(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.addEventListener('loadedmetadata', () => {
          scanLoop();
        });
      }
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function scanLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code?.data) {
      const url = code.data;
      setDetected(url);
      stopCamera();

      // Navega automaticamente se for URL do QuickPick
      try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith('/menu/')) {
          router.push(parsed.pathname + parsed.search);
          return;
        }
      } catch {}

      // URL externa: exibe para o usuário clicar
      return;
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const newState = !torch;
    await track.applyConstraints({ advanced: [{ torch: newState } as MediaTrackConstraintSet] });
    setTorch(newState);
  }

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <Link href="/" className="text-white/80 hover:text-white">
          <X className="w-6 h-6" />
        </Link>
        <p className="text-white font-semibold text-sm">Escanear QR Code</p>
        {torchSupported && (
          <button onClick={toggleTorch} className="text-white/80 hover:text-white">
            {torch ? <FlashlightOff className="w-6 h-6" /> : <Flashlight className="w-6 h-6" />}
          </button>
        )}
        {!torchSupported && <div className="w-6" />}
      </div>

      {/* Câmera */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay com mira */}
        {!detected && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Cantos da mira */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-orange-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-orange-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-orange-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-orange-400 rounded-br-lg" />
              {/* Linha de scan animada */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-orange-400 animate-scan" />
            </div>
          </div>
        )}
      </div>

      {/* Instrução / Resultado / Erro */}
      <div className="px-4 py-6 text-center z-10">
        {error ? (
          <div className="space-y-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={startCamera}
              className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : detected ? (
          <div className="space-y-3">
            <p className="text-green-400 text-sm font-medium">QR Code detectado!</p>
            <a
              href={detected}
              className="block bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Abrir cardápio
            </a>
          </div>
        ) : (
          <p className="text-white/60 text-sm">
            Aponte a câmera para o QR Code da barraca
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </main>
  );
}
