'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface QueueEntryPublic {
  id: string;
  customer_name: string;
  party_size: number;
  status: string;
  position: number;
  created_at: string;
}

interface Props {
  vendorId: string;
  vendorName: string;
  vendorLogo: string | null;
  totalTables: number;
  freeTables: number;
  waitingCount: number;
  queueEntries: QueueEntryPublic[];
}

type Step = 'info' | 'form' | 'tracking';

export default function QueueClient({
  vendorId, vendorName, vendorLogo,
  totalTables: initialTotal, freeTables: initialFree, waitingCount: initialWaiting,
  queueEntries: initialEntries,
}: Props) {
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  // Dados em tempo real
  const [freeTables, setFreeTables] = useState(initialFree);
  const [totalTables, setTotalTables] = useState(initialTotal);
  const [waitingCount, setWaitingCount] = useState(initialWaiting);
  const [estimatedWait, setEstimatedWait] = useState(0);

  // Minha entrada na fila
  const [myEntryId, setMyEntryId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(`queue_${vendorId}`);
    return null;
  });
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [myStatus, setMyStatus] = useState<string | null>(null);

  // Polling para atualizar dados da fila
  const fetchQueueStatus = useCallback(async () => {
    const url = new URL('/api/queue', window.location.origin);
    url.searchParams.set('vendor_id', vendorId);
    if (myEntryId) url.searchParams.set('entry_id', myEntryId);

    const res = await fetch(url.toString());
    if (!res.ok) return;
    const data = await res.json();

    setFreeTables(data.stats.freeTables);
    setTotalTables(data.stats.totalTables);
    setWaitingCount(data.stats.waitingCount);
    setEstimatedWait(data.stats.estimatedWaitMin);

    if (data.myEntry) {
      setMyStatus(data.myEntry.status);
      if (data.myEntry.status === 'waiting' || data.myEntry.status === 'called') {
        // Calcula posição relativa
        const waitingBefore = data.queue.filter((q: any) =>
          q.position < data.myEntry.position && (q.status === 'waiting' || q.status === 'called')
        ).length;
        setMyPosition(waitingBefore + 1);
        setStep('tracking');
      } else if (['seated', 'cancelled', 'no_show'].includes(data.myEntry.status)) {
        localStorage.removeItem(`queue_${vendorId}`);
        setMyEntryId(null);
        setMyPosition(null);
        setMyStatus(null);
        setStep('info');
      }
    }
  }, [vendorId, myEntryId]);

  useEffect(() => {
    fetchQueueStatus();
    const timer = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(timer);
  }, [fetchQueueStatus]);

  // Verifica se tem entrada ativa ao carregar
  useEffect(() => {
    if (myEntryId) setStep('tracking');
  }, [myEntryId]);

  async function joinQueue() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          customer_name: name.trim(),
          customer_phone: phone.replace(/\D/g, '') || null,
          party_size: partySize,
        }),
      });
      const data = await res.json();
      if (data.entry) {
        setMyEntryId(data.entry.id);
        setMyPosition(data.entry.position);
        setMyStatus('waiting');
        localStorage.setItem(`queue_${vendorId}`, data.entry.id);
        setStep('tracking');
      }
    } catch {
      alert('Erro ao entrar na fila. Tente novamente.');
    }
    setSubmitting(false);
  }

  async function leaveQueue() {
    if (!myEntryId || !confirm('Deseja sair da fila?')) return;
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId, cancel_entry_id: myEntryId }),
    }).catch(() => {});
    localStorage.removeItem(`queue_${vendorId}`);
    setMyEntryId(null);
    setMyPosition(null);
    setMyStatus(null);
    setStep('info');
  }

  function phoneMask(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  const hasQueue = freeTables === 0 || waitingCount > 0;
  const P = '#ec5b13';

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/menu/${vendorId}`} className="p-1.5 text-gray-400 hover:text-gray-900 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {vendorLogo && (
            <Image src={vendorLogo} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
          )}
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-none">{vendorName}</h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Fila de Espera</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Status das mesas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black" style={{ color: freeTables > 0 ? '#10b981' : '#ef4444' }}>{freeTables}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Mesas livres</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-700">{totalTables}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Total mesas</p>
            </div>
            <div>
              <p className="text-2xl font-black text-purple-600">{waitingCount}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Na fila</p>
            </div>
          </div>

          {hasQueue && estimatedWait > 0 && (
            <div className="mt-4 bg-amber-50 rounded-xl p-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700">Tempo estimado de espera</p>
                <p className="text-lg font-black text-amber-800">~{estimatedWait} min</p>
              </div>
            </div>
          )}

          {!hasQueue && (
            <div className="mt-4 bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-700">Mesas disponíveis!</p>
                <p className="text-[10px] text-emerald-600">Você pode ir direto ao estabelecimento.</p>
              </div>
            </div>
          )}
        </div>

        {/* Step: INFO - mostra botão de entrar na fila */}
        {step === 'info' && hasQueue && (
          <button
            onClick={() => setStep('form')}
            className="w-full text-white text-sm font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            style={{ backgroundColor: P }}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Entrar na Fila de Espera
          </button>
        )}

        {step === 'info' && !hasQueue && (
          <Link
            href={`/menu/${vendorId}`}
            className="block w-full text-center text-white text-sm font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            style={{ backgroundColor: P }}
          >
            Ver Cardápio e Fazer Pedido
          </Link>
        )}

        {/* Step: FORM - formulário para entrar na fila */}
        {step === 'form' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="font-bold text-gray-900">Entrar na fila</h2>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Seu nome *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome para chamar"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Celular (opcional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(phoneMask(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Quantas pessoas?</label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setPartySize(n)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${partySize === n ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                    style={partySize === n ? { backgroundColor: P } : {}}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  min={7}
                  max={50}
                  value={partySize > 6 ? partySize : ''}
                  onChange={e => setPartySize(parseInt(e.target.value) || 7)}
                  placeholder="7+"
                  className="w-14 h-10 border border-gray-200 rounded-xl px-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('info')} className="flex-1 bg-gray-100 text-gray-600 text-sm font-bold py-3 rounded-xl">Voltar</button>
              <button
                onClick={joinQueue}
                disabled={submitting || !name.trim()}
                className="flex-2 flex-grow text-white text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                style={{ backgroundColor: P }}
              >
                {submitting ? 'Entrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        {/* Step: TRACKING - acompanhando posição na fila */}
        {step === 'tracking' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Card de posição */}
            {myStatus === 'called' ? (
              <div className="bg-emerald-500 rounded-2xl p-6 text-white text-center shadow-lg animate-pulse">
                <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                <h2 className="text-2xl font-black uppercase tracking-wider">Sua vez chegou!</h2>
                <p className="text-sm opacity-90 mt-1">Dirija-se ao atendente para ser acomodado.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm p-6 text-center">
                <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Sua posição na fila</p>
                <p className="text-6xl font-black text-purple-700">{myPosition ?? '...'}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {myPosition === 1
                    ? 'Você é o próximo! Aguarde ser chamado.'
                    : `${(myPosition ?? 1) - 1} pessoa${(myPosition ?? 1) - 1 > 1 ? 's' : ''} na sua frente`
                  }
                </p>
                {estimatedWait > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">~{Math.ceil(estimatedWait * ((myPosition ?? 1) / Math.max(waitingCount, 1)))} min</span>
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-500">
                Fique de olho nesta página. Quando for sua vez, o card ficará verde.
                Você também pode ver o cardápio enquanto espera.
              </p>
            </div>

            {/* Ações */}
            <div className="flex gap-3">
              <Link
                href={`/menu/${vendorId}`}
                className="flex-1 text-center bg-gray-100 text-gray-700 text-sm font-bold py-3 rounded-xl"
              >
                Ver Cardápio
              </Link>
              <button
                onClick={leaveQueue}
                className="flex-1 text-red-500 text-sm font-bold py-3 rounded-xl border border-red-200"
              >
                Sair da Fila
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
