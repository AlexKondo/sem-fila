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
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
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

  // ── Invite form ──
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFee, setInviteFee] = useState(String(event.default_booth_fee));
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // ── Layout ──
  const GRID_SIZE = 12;
  const [boothLabel, setBoothLabel] = useState('');
  const [placingBooth, setPlacingBooth] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);

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
    if (!inviteEmail.trim()) { setInviteError('Email obrigatório.'); return; }
    setInviteError(''); setInviteSending(true);
    const supabase = createClient();

    const insertData: Record<string, any> = {
      event_id: event.id,
      vendor_email: inviteEmail.trim(),
      fee_amount: parseFloat(inviteFee) || 0,
    };
    if (selectedVendorId) insertData.vendor_id = selectedVendorId;

    const { data, error } = await supabase.from('event_vendor_invitations')
      .insert(insertData)
      .select('*, vendors(name)').single();

    if (error) { setInviteError(error.message); setInviteSending(false); return; }
    setInvitations(prev => [data as Invitation, ...prev]);
    setInviteEmail('');
    setSelectedVendorId('');
    setInviteFee(String(event.default_booth_fee));
    setInviteSending(false);
  }, [inviteEmail, inviteFee, selectedVendorId, event.id, event.default_booth_fee]);

  const deleteInvite = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from('event_vendor_invitations').delete().eq('id', id);
    setInvitations(prev => prev.filter(i => i.id !== id));
  }, []);

  // ── Layout: adicionar barraca no grid ──
  const addBooth = useCallback(async (x: number, y: number) => {
    if (!placingBooth) return;
    const label = boothLabel.trim() || `${String.fromCharCode(65 + Math.floor(y / 2))}${x + 1}`;

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
      alert('Não há barracas disponíveis ou vendedores pagos sem barraca.');
      return;
    }

    const shuffled = [...availableBooths].sort(() => Math.random() - 0.5);
    const supabase = createClient();
    const assignments: string[] = [];

    for (let i = 0; i < Math.min(shuffled.length, paidInvites.length); i++) {
      const booth = shuffled[i];
      const invite = paidInvites[i];

      await supabase.from('event_booths').update({
        vendor_id: invite.vendors ? undefined : null,
        status: 'confirmed',
      }).eq('id', booth.id);

      await supabase.from('event_vendor_invitations').update({
        booth_id: booth.id,
      }).eq('id', invite.id);

      assignments.push(`${booth.label} → ${invite.vendor_email}`);
    }

    alert(`Sorteio realizado!\n\n${assignments.join('\n')}`);
    window.location.reload();
  }, [booths, invitations]);

  const totalRevenue = revenueData.reduce((acc, r) => acc + r.revenue, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      {/* Tabs */}
      <div className="flex bg-white rounded-2xl shadow-sm p-1 gap-1">
        {[
          { key: 'invitations' as Tab, label: 'Convites', icon: <Users className="w-4 h-4" /> },
          { key: 'layout' as Tab, label: 'Layout', icon: <LayoutGrid className="w-4 h-4" /> },
          { key: 'revenue' as Tab, label: 'Faturamento', icon: <DollarSign className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === t.key ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ CONVITES ═══════════ */}
      {tab === 'invitations' && (
        <div className="space-y-4">
          {/* Form de convite */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Convidar fornecedor</h3>
            {inviteError && <p className="text-red-600 text-xs">{inviteError}</p>}

            {/* Selecionar vendor existente */}
            {availableVendors.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Selecionar fornecedor existente</label>
                <select
                  value={selectedVendorId}
                  onChange={e => handleVendorSelect(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                >
                  <option value="">— Digitar email manualmente —</option>
                  {availableVendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.email ? `(${v.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email + taxa + enviar */}
            <div className="flex gap-2">
              <input
                type="email" placeholder="Email do fornecedor"
                value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setSelectedVendorId(''); }}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                type="number" placeholder="Taxa" min="0" step="0.01"
                value={inviteFee} onChange={e => setInviteFee(e.target.value)}
                className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button onClick={sendInvite} disabled={inviteSending}
                className="bg-purple-600 text-white px-4 rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 text-sm font-medium">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          {invitations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Nenhum convite enviado ainda.</p>
            </div>
          ) : (
            invitations.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">
                      {inv.vendors?.name ? `${inv.vendors.name} · ` : ''}{inv.vendor_email}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Taxa: R$ {Number(inv.fee_amount).toFixed(2)}
                    {inv.booth_id && ` · Barraca atribuída`}
                  </p>
                  <p className="text-xs text-gray-400">
                    Enviado: {new Date(inv.invited_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button onClick={() => deleteInvite(inv.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════ LAYOUT ═══════════ */}
      {tab === 'layout' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setPlacingBooth(!placingBooth)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition ${
                placingBooth ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
              }`}
            >
              <Plus className="w-4 h-4" /> {placingBooth ? 'Clique no grid...' : 'Adicionar barraca'}
            </button>

            {placingBooth && (
              <input
                placeholder="Rótulo (ex: A1)"
                value={boothLabel} onChange={e => setBoothLabel(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            )}

            {event.booth_selection_mode === 'lottery' && (
              <button
                onClick={runLottery}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 ml-auto"
              >
                <Shuffle className="w-4 h-4" /> Sortear barracas
              </button>
            )}
          </div>

          {/* Grid do mapa */}
          <div className="bg-white rounded-2xl shadow-sm p-4 overflow-x-auto">
            <div
              className="grid gap-1 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
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
                      className={`aspect-square rounded-lg flex items-center justify-center text-[9px] font-bold relative group cursor-pointer ${
                        booth.status === 'confirmed'
                          ? 'bg-green-200 text-green-800'
                          : booth.status === 'reserved'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-purple-200 text-purple-800'
                      }`}
                      title={`${booth.label}${booth.vendors?.name ? ` - ${booth.vendors.name}` : ''}`}
                    >
                      {booth.label}
                      <button
                        onClick={() => deleteBooth(booth.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[8px] hidden group-hover:flex"
                      >
                        ×
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    onClick={() => addBooth(x, y)}
                    className={`aspect-square rounded-lg border border-dashed transition ${
                      placingBooth
                        ? 'border-purple-300 bg-purple-50 cursor-pointer hover:bg-purple-100'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500 justify-center">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-200" /> Disponível
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-200" /> Reservada
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-200" /> Confirmada
              </div>
            </div>
          </div>

          {/* Lista de barracas */}
          {booths.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">Barracas ({booths.length})</h3>
              <div className="space-y-1">
                {booths.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                        b.status === 'confirmed' ? 'bg-green-200 text-green-800'
                        : b.status === 'reserved' ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-purple-200 text-purple-800'
                      }`}>
                        {b.label}
                      </span>
                      <span className="text-gray-700">{b.vendors?.name || 'Vaga'}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      b.status === 'confirmed' ? 'bg-green-100 text-green-700'
                      : b.status === 'reserved' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {b.status === 'confirmed' ? 'Confirmada' : b.status === 'reserved' ? 'Reservada' : 'Disponível'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ FATURAMENTO ═══════════ */}
      {tab === 'revenue' && (
        <div className="space-y-4">
          {/* Total geral */}
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-gray-500 mb-1">Faturamento Total do Evento</p>
            <p className="text-3xl font-bold text-gray-900">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Por barraca */}
          {revenueData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Nenhuma barraca vinculada a este evento.</p>
            </div>
          ) : (
            revenueData
              .sort((a, b) => b.revenue - a.revenue)
              .map(item => (
                <div key={item.vendorId} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.vendorName}</p>
                  </div>
                  <p className="font-bold text-gray-900">
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
