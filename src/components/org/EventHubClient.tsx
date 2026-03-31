'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Users, LayoutGrid, DollarSign, Plus, Trash2, Check, X, Shuffle } from 'lucide-react';

type Booth = {
  id: string;
  label: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  vendor_id: string | null;
  status: string;
  vendors?: { name: string } | null;
};

type Invitation = {
  id: string;
  vendor_email: string;
  fee_amount: number;
  status: string;
  booth_id: string | null;
  invited_at: string;
  responded_at: string | null;
  paid_at: string | null;
  vendors?: { name: string } | null;
};

type RevenueItem = {
  vendorId: string;
  vendorName: string;
  revenue: number;
};

type AvailableVendor = {
  id: string;
  name: string;
  email: string;
};

type EventData = {
  id: string;
  name: string;
  default_booth_fee: number;
  booth_selection_mode: string;
  [key: string]: any;
};

type Tab = 'invitations' | 'layout' | 'revenue';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  paid: 'Pago',
  rejected: 'Recusado',
  expired: 'Expirado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  accepted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  expired: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
};

export default function EventHubClient({
  event,
  initialBooths,
  initialInvitations,
  revenueData,
  availableVendors = [],
}: {
  event: EventData;
  initialBooths: Booth[];
  initialInvitations: Invitation[];
  revenueData: RevenueItem[];
  availableVendors?: AvailableVendor[];
}) {
  const [tab, setTab] = useState<Tab>('invitations');
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [booths, setBooths] = useState<Booth[]>(initialBooths);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFee, setInviteFee] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const GRID_SIZE = 12;
  const [boothLabel, setBoothLabel] = useState('');
  const [placingBooth, setPlacingBooth] = useState(false);

  const handleVendorSelect = useCallback((vendorId: string) => {
    setSelectedVendorId(vendorId);
    if (vendorId) {
      const vendor = availableVendors.find(v => v.id === vendorId);
      if (vendor) setInviteEmail(vendor.email);
    } else {
      setInviteEmail('');
    }
  }, [availableVendors]);

  const sendInvite = useCallback(async () => {
    if (!inviteEmail.trim()) { setInviteError('Email obrigatrio.'); return; }
    setInviteError(''); setInviteSending(true);

    try {
      const res = await fetch('/api/event-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          vendor_email: inviteEmail.trim(),
          fee_amount: inviteFee || 0,
          vendor_id: selectedVendorId || undefined,
        }),
      });
      const result = await res.json();

      if (!res.ok) { setInviteError(result.error ?? 'Erro ao enviar convite.'); setInviteSending(false); return; }

      setInvitations(prev => [result.invitation as Invitation, ...prev]);
      setInviteEmail('');
      setSelectedVendorId('');
      setInviteFee('');

      if (result.emailSent === false) {
        setInviteError('Convite salvo, mas nǜo foi possvel enviar o email.');
      }
    } catch {
      setInviteError('Erro de conexǜo ao enviar convite.');
    }
    setInviteSending(false);
  }, [inviteEmail, inviteFee, selectedVendorId, event.id]);

  const deleteInvite = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from('event_vendor_invitations').delete().eq('id', id);
    setInvitations(prev => prev.filter(i => i.id !== id));
  }, []);

  const addBooth = useCallback(async (x: number, y: number) => {
    if (!placingBooth) return;
    const label = boothLabel.trim() || String.fromCharCode(65 + y) + (x + 1);

    const supabase = createClient();
    const { data, error } = await supabase.from('event_booths').insert({
      event_id: event.id,
      label,
      position_x: x,
      position_y: y,
    }).select('*, vendors(name)').single();

    if (error) { alert(error.message); return; }
    setBooths(prev => [...prev, data as Booth]);
    setBoothLabel('');
    setPlacingBooth(false);
  }, [placingBooth, boothLabel, event.id]);

  const deleteBooth = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from('event_booths').delete().eq('id', id);
    setBooths(prev => prev.filter(b => b.id !== id));
  }, []);

  const runLottery = useCallback(async () => {
    const availableBooths = booths.filter(b => b.status === 'available' && !b.vendor_id);
    const paidInvites = invitations.filter(i => i.status === 'paid' && !i.booth_id);

    if (availableBooths.length === 0 || paidInvites.length === 0) {
      alert('Nǜo hǭ barracas disponveis ou vendedores pagos sem barraca.');
      return;
    }

    const shuffled = [...availableBooths].sort(() => Math.random() - 0.5);
    const supabase = createClient();
    const assignments: string[] = [];

    for (let i = 0; i < Math.min(shuffled.length, paidInvites.length); i++) {
      const booth = shuffled[i];
      const invite = paidInvites[i];

      await supabase.from('event_booths').update({
        vendor_id: invite.vendor_id || null,
        status: 'confirmed',
      }).eq('id', booth.id);

      await supabase.from('event_vendor_invitations').update({
        booth_id: booth.id,
      }).eq('id', invite.id);

      assignments.push(booth.label + " -> " + invite.vendor_email);
    }

    alert('Sorteio realizado!\n\n' + assignments.join('\n'));
    window.location.reload();
  }, [booths, invitations]);

  const totalRevenue = revenueData.reduce((acc, r) => acc + r.revenue, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-1 gap-1 border border-slate-100 dark:border-slate-800">
        {[
          { key: 'invitations' as Tab, label: 'Convites', icon: <Users className="w-4 h-4" /> },
          { key: 'layout' as Tab, label: 'Layout', icon: <LayoutGrid className="w-4 h-4" /> },
          { key: 'revenue' as Tab, label: 'Faturamento', icon: <DollarSign className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={"flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition " + (tab === t.key ? "bg-purple-600 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800")}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'invitations' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 space-y-3 border border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Convidar fornecedor</h3>
            {inviteError && <p className="text-red-600 dark:text-red-400 text-xs">{inviteError}</p>}

            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Selecionar fornecedor existente</label>
              <select
                value={selectedVendorId}
                onChange={e => handleVendorSelect(e.target.value)}
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="" className="dark:bg-slate-900">Selecione kiosks / barracas / food trucks existentes</option>
                {availableVendors.map(v => (
                  <option key={v.id} value={v.id} className="dark:bg-slate-900">
                    {v.name} {v.email ? "(" + v.email + ")" : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Email</label>
                <input
                  type="email" placeholder="Email do fornecedor"
                  value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setSelectedVendorId(''); }}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Taxa (R$)</label>
                <input
                  type="number" placeholder="0.00" min="0" step="0.01"
                  value={inviteFee} onChange={e => setInviteFee(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <button onClick={sendInvite} disabled={inviteSending}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 text-sm font-medium h-[38px] shadow-lg shadow-purple-500/20">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {invitations.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-600">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Nenhum convite enviado ainda.</p>
            </div>
          ) : (
            invitations.map(inv => (
              <div key={inv.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {inv.vendors?.name ? inv.vendors.name + " - " : ''}{inv.vendor_email}
                    </p>
                    <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm " + (STATUS_COLORS[inv.status] ?? "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400")}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    Taxa: R$ {Number(inv.fee_amount).toFixed(2)}
                    {inv.booth_id && "  Barraca atribuda"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Enviado: {new Date(inv.invited_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button onClick={() => deleteInvite(inv.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'layout' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex items-center gap-3 flex-wrap border border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setPlacingBooth(!placingBooth)}
              className={"flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition " + (placingBooth ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30")}
            >
              <Plus className="w-4 h-4" /> {placingBooth ? 'Clique no grid...' : 'Adicionar barraca'}
            </button>

            {placingBooth && (
              <input
                placeholder="Rtulo (ex: A1)"
                value={boothLabel} onChange={e => setBoothLabel(e.target.value)}
                className="border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            )}

            {event.booth_selection_mode === 'lottery' && (
              <button
                onClick={runLottery}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 ml-auto transition-colors"
              >
                <Shuffle className="w-4 h-4" /> Sortear barracas
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 overflow-x-auto border border-slate-100 dark:border-slate-800">
            <div
              className="grid gap-1 mx-auto"
              style={{
                gridTemplateColumns: "repeat(" + GRID_SIZE + ", minmax(0, 1fr))",
                maxWidth: 600,
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                const x = idx % GRID_SIZE;
                const y = Math.floor(idx / GRID_SIZE);
                const booth = booths.find(b => b.position_x === x && b.position_y === y);

                if (booth) {
                  return (
                    <div
                      key={idx}
                      className={"aspect-square rounded-lg flex items-center justify-center text-[9px] font-bold relative group cursor-pointer transition-all " + (booth.status === 'confirmed' ? "bg-green-200 dark:bg-green-900/60 text-green-800 dark:text-green-200" : booth.status === 'reserved' ? "bg-yellow-200 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200" : "bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200")}
                      title={booth.label + (booth.vendors?.name ? " - " + booth.vendors.name : '')}
                    >
                      {booth.label}
                      <button
                        onClick={() => deleteBooth(booth.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[8px] hidden group-hover:flex shadow-sm"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    onClick={() => addBooth(x, y)}
                    className={"aspect-square rounded-lg border border-dashed transition-all " + (placingBooth ? "border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-950/30 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40" : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50")}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500 dark:text-slate-500 justify-center">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-900/60" /> Disponvel
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/60" /> Reservada
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/60" /> Confirmada
              </div>
            </div>
          </div>

          {booths.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Barracas ({booths.length})</h3>
              <div className="space-y-1">
                {booths.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={"min-w-[4.5rem] h-6 px-2 rounded-lg flex items-center justify-center text-[10px] font-bold whitespace-nowrap shadow-sm " + (b.status === 'confirmed' ? "bg-green-200 dark:bg-green-900/60 text-green-800 dark:text-green-200" : b.status === 'reserved' ? "bg-yellow-200 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200" : "bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200")}>
                        {b.label}
                      </span>
                      <span className="text-gray-700 dark:text-slate-300 font-medium">{b.vendors?.name || 'Vaga'}</span>
                    </div>
                    <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold " + (b.status === 'confirmed' ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" : b.status === 'reserved' ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400")}>
                      {b.status === 'confirmed' ? 'Confirmada' : b.status === 'reserved' ? 'Reservada' : 'Disponvel'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'revenue' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 text-center border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Faturamento Total do Evento</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {revenueData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-600">
              <DollarSign className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Nenhuma barraca vinculada a este evento.</p>
            </div>
          ) : (
            revenueData
              .sort((a, b) => b.revenue - a.revenue)
              .map(item => (
                <div key={item.vendorId} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{item.vendorName}</p>
                  </div>
                  <p className="font-black text-gray-900 dark:text-orange-500">
                    R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
