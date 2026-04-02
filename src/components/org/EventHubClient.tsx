'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Users, LayoutGrid, DollarSign, Plus, Trash2, X, Shuffle, Minus, Square } from 'lucide-react';

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
  vendor_id: string | null;
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

type LayoutCellType = 'corridor' | 'entrance' | 'exit' | 'wall';

type LayoutCell = {
  id: string;
  event_id: string;
  position_x: number;
  position_y: number;
  cell_type: LayoutCellType;
};

type Tab = 'invitations' | 'layout' | 'revenue' | 'configs';

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

const DRAW_TYPES: { type: LayoutCellType; label: string; activeClass: string; idleClass: string }[] = [
  {
    type: 'corridor',
    label: 'Corredor',
    activeClass: 'bg-slate-500 text-white shadow-lg',
    idleClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
  },
  {
    type: 'entrance',
    label: 'Entrada',
    activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
    idleClass: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
  },
  {
    type: 'exit',
    label: 'Saída',
    activeClass: 'bg-red-600 text-white shadow-lg shadow-red-500/20',
    idleClass: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
  },
  {
    type: 'wall',
    label: 'Parede',
    activeClass: 'bg-slate-800 text-white shadow-lg',
    idleClass: 'bg-gray-100 dark:bg-gray-900/60 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800',
  },
];

function getCellClass(lc: LayoutCell): string {
  switch (lc.cell_type) {
    case 'corridor': return 'bg-slate-200 dark:bg-slate-600';
    case 'entrance': return 'bg-emerald-200 dark:bg-emerald-700/60 flex items-center justify-center';
    case 'exit': return 'bg-red-200 dark:bg-red-700/60 flex items-center justify-center';
    case 'wall': return 'bg-slate-600 dark:bg-slate-900';
    default: return '';
  }
}

function getCellLabel(lc: LayoutCell): string | null {
  if (lc.cell_type === 'entrance') return 'ENT';
  if (lc.cell_type === 'exit') return 'SAÍ';
  return null;
}

function getCellTextClass(lc: LayoutCell): string {
  if (lc.cell_type === 'entrance') return 'text-[7px] font-black text-emerald-800 dark:text-emerald-100';
  if (lc.cell_type === 'exit') return 'text-[7px] font-black text-red-800 dark:text-red-100';
  return '';
}

export default function EventHubClient({
  event,
  initialBooths,
  initialInvitations,
  initialLayoutCells = [],
  revenueData,
  availableVendors = [],
}: {
  event: EventData;
  initialBooths: Booth[];
  initialInvitations: Invitation[];
  initialLayoutCells?: LayoutCell[];
  revenueData: RevenueItem[];
  availableVendors?: AvailableVendor[];
}) {
  const [tab, setTab] = useState<Tab>('invitations');
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [booths, setBooths] = useState<Booth[]>(initialBooths);
  const [layoutCells, setLayoutCells] = useState<LayoutCell[]>(initialLayoutCells);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFee, setInviteFee] = useState(event.default_booth_fee > 0 ? String(event.default_booth_fee) : '');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const [eventName, setEventName] = useState(event.name || '');
  const [eventLocation, setEventLocation] = useState(event.location || '');
  const [eventAddress, setEventAddress] = useState(event.address || '');
  const [eventRules, setEventRules] = useState(event.rules || '');
  const [eventLayoutUrl, setEventLayoutUrl] = useState(event.layout_url || '');
  const [savingConfigs, setSavingConfigs] = useState(false);

  const GRID_SIZE = 12;
  const [boothLabel, setBoothLabel] = useState('');
  const [placingBooth, setPlacingBooth] = useState(false);
  const [drawType, setDrawType] = useState<LayoutCellType | null>(null);

  // Drag-to-paint: track painted cells in current drag to avoid double-writes
  const isPainting = useRef(false);
  const paintedThisDrag = useRef(new Set<string>());

  useEffect(() => {
    const onUp = () => {
      isPainting.current = false;
      paintedThisDrag.current.clear();
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

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
        setInviteError('Convite salvo, mas não foi possível enviar o email.');
      }
    } catch {
      setInviteError('Erro de conexão ao enviar convite.');
    }
    setInviteSending(false);
  }, [inviteEmail, inviteFee, selectedVendorId, event.id]);

  const deleteInvite = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from('event_vendor_invitations').delete().eq('id', id);
    setInvitations(prev => prev.filter(i => i.id !== id));
  }, []);

  const addBooth = useCallback(async (x: number, y: number) => {
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
  }, [boothLabel, event.id]);

  const deleteBooth = useCallback(async (id: string) => {
    const supabase = createClient();
    await supabase.from('event_booths').delete().eq('id', id);
    setBooths(prev => prev.filter(b => b.id !== id));
  }, []);

  const paintCell = useCallback(async (x: number, y: number) => {
    if (!drawType) return;
    const key = `${x},${y}`;
    if (paintedThisDrag.current.has(key)) return;
    paintedThisDrag.current.add(key);

    const existing = layoutCells.find(c => c.position_x === x && c.position_y === y);
    const supabase = createClient();

    if (existing) {
      if (existing.cell_type === drawType) {
        // Same type: erase (toggle off)
        await supabase.from('event_layout_cells').delete().eq('id', existing.id);
        setLayoutCells(prev => prev.filter(c => c.id !== existing.id));
      } else {
        // Different type: update
        const { data } = await supabase
          .from('event_layout_cells')
          .update({ cell_type: drawType })
          .eq('id', existing.id)
          .select()
          .single();
        if (data) setLayoutCells(prev => prev.map(c => c.id === existing.id ? (data as LayoutCell) : c));
      }
    } else {
      const { data } = await supabase
        .from('event_layout_cells')
        .insert({ event_id: event.id, position_x: x, position_y: y, cell_type: drawType })
        .select()
        .single();
      if (data) setLayoutCells(prev => [...prev, data as LayoutCell]);
    }
  }, [drawType, layoutCells, event.id]);

  const handleCellMouseDown = useCallback((x: number, y: number) => {
    if (placingBooth) {
      const existing = booths.find(b => b.position_x === x && b.position_y === y);
      if (existing) {
        deleteBooth(existing.id);
      } else {
        addBooth(x, y);
      }
      return;
    }
    if (drawType) {
      isPainting.current = true;
      paintedThisDrag.current.clear();
      paintCell(x, y);
    }
  }, [placingBooth, drawType, addBooth, paintCell]);

  const handleCellMouseEnter = useCallback((x: number, y: number) => {
    if (isPainting.current && drawType) {
      paintCell(x, y);
    }
  }, [drawType, paintCell]);

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

  const saveConfigs = useCallback(async () => {
    setSavingConfigs(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('events')
      .update({
        name: eventName,
        location: eventLocation,
        address: eventAddress,
        rules: eventRules,
        layout_url: eventLayoutUrl
      })
      .eq('id', event.id);

    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
    } else {
      alert('Configurações salvas com sucesso!');
    }
    setSavingConfigs(false);
  }, [event.id, eventName, eventLocation, eventAddress, eventRules, eventLayoutUrl]);

  const totalRevenue = revenueData.reduce((acc, r) => acc + r.revenue, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4 transition-colors duration-300">
      <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-1 gap-1 border border-slate-100 dark:border-slate-800 transition-colors">
        {[
          { key: 'invitations' as Tab, label: 'Convites', icon: <Users className="w-4 h-4" /> },
          { key: 'layout' as Tab, label: 'Layout', icon: <LayoutGrid className="w-4 h-4" /> },
          { key: 'revenue' as Tab, label: 'Faturamento', icon: <DollarSign className="w-4 h-4" /> },
          { key: 'configs' as Tab, label: 'Ajustes', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={"flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition " + (tab === t.key ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800")}
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
            <div className="text-center py-12 text-gray-400 dark:text-slate-600 transition-colors">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Nenhum convite enviado ainda.</p>
            </div>
          ) : (
            invitations.map(inv => (
              <div key={inv.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800 transition-colors">
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
                    {inv.booth_id && "  Barraca atribuída"}
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

      {tab === 'configs' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 border border-slate-100 dark:border-slate-800 transition-colors space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Editar Detalhes do Evento
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Nome do Evento</label>
                <input
                  type="text" value={eventName} onChange={e => setEventName(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Local</label>
                  <input
                    type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Layout (Link Imagem/Drive)</label>
                  <input
                    type="text" value={eventLayoutUrl} onChange={e => setEventLayoutUrl(e.target.value)}
                    placeholder="URL com o mapa das mesas"
                    className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                <input
                  type="text" value={eventAddress} onChange={e => setEventAddress(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Regras do Evento</label>
                <textarea
                  value={eventRules} onChange={e => setEventRules(e.target.value)}
                  rows={6} placeholder="Descreva as obrigações, horários de montagem, taxas extras e orientações gerais..."
                  className="w-full border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={saveConfigs}
              disabled={savingConfigs}
              className="w-full bg-purple-600 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {savingConfigs ? 'Salvando...' : 'SALVAR CONFIGURAÇÕES'}
            </button>
          </div>
        </div>
      )}

      {tab === 'layout' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-3 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Barraca */}
              <button
                onClick={() => { setPlacingBooth(!placingBooth); setDrawType(null); }}
                className={"flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition " + (placingBooth ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30")}
              >
                <Plus className="w-4 h-4" /> {placingBooth ? 'Clique no grid...' : 'Barraca'}
              </button>

              {placingBooth && (
                <input
                  placeholder="Rótulo (ex: A1)"
                  value={boothLabel} onChange={e => setBoothLabel(e.target.value)}
                  className="border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              )}

              {/* Draw type buttons */}
              {DRAW_TYPES.map(dt => (
                <button
                  key={dt.type}
                  onClick={() => { setDrawType(drawType === dt.type ? null : dt.type); setPlacingBooth(false); setBoothLabel(''); }}
                  className={"flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition " + (drawType === dt.type ? dt.activeClass : dt.idleClass)}
                >
                  {dt.type === 'corridor' && <Minus className="w-3.5 h-3.5" />}
                  {dt.type === 'wall' && <Square className="w-3.5 h-3.5" />}
                  {dt.label}
                </button>
              ))}

              {event.booth_selection_mode === 'lottery' && (
                <button
                  onClick={runLottery}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 ml-auto transition-colors"
                >
                  <Shuffle className="w-4 h-4" /> Sortear
                </button>
              )}
            </div>

            {drawType && (
              <p className="text-[11px] text-gray-400 dark:text-slate-500 px-1">
                Clique ou arraste nas células para pintar. Clique na mesma célula para apagar.
              </p>
            )}
          </div>

          {/* Grid */}
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 overflow-x-auto border border-slate-100 dark:border-slate-800 transition-colors select-none"
            onDragStart={e => e.preventDefault()}
          >
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
                const lc = layoutCells.find(c => c.position_x === x && c.position_y === y);

                if (booth) {
                  return (
                    <div
                      key={idx}
                      className={"aspect-square rounded-lg flex items-center justify-center text-[9px] font-bold relative group cursor-pointer transition-all " + (booth.status === 'confirmed' ? "bg-green-200 dark:bg-green-600/60 text-green-800 dark:text-green-100" : booth.status === 'reserved' ? "bg-yellow-200 dark:bg-yellow-600/60 text-yellow-800 dark:text-yellow-100" : "bg-purple-200 dark:bg-purple-600/60 text-purple-800 dark:text-purple-100")}
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

                // Layout cell or empty cell
                const isActive = placingBooth || drawType !== null;

                if (lc) {
                  const label = getCellLabel(lc);
                  return (
                    <div
                      key={idx}
                      onMouseDown={() => handleCellMouseDown(x, y)}
                      onMouseEnter={() => handleCellMouseEnter(x, y)}
                      className={"aspect-square rounded-sm transition-all " + getCellClass(lc) + (isActive ? " cursor-pointer opacity-80 hover:opacity-60" : "")}
                      title={lc.cell_type}
                    >
                      {label && <span className={getCellTextClass(lc)}>{label}</span>}
                    </div>
                  );
                }

                // Empty cell
                let emptyClass = "aspect-square rounded-lg border border-dashed transition-all ";
                if (isActive) {
                  const hoverBg = drawType === 'corridor' ? 'hover:bg-slate-100 dark:hover:bg-slate-700/40' :
                                  drawType === 'entrance' ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20' :
                                  drawType === 'exit' ? 'hover:bg-red-50 dark:hover:bg-red-900/20' :
                                  drawType === 'wall' ? 'hover:bg-slate-200 dark:hover:bg-slate-700/60' :
                                  'hover:bg-purple-100 dark:hover:bg-purple-900/20';
                  emptyClass += `border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-950/50 cursor-pointer ${hoverBg}`;
                } else {
                  emptyClass += "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50";
                }

                return (
                  <div
                    key={idx}
                    onMouseDown={() => handleCellMouseDown(x, y)}
                    onMouseEnter={() => handleCellMouseEnter(x, y)}
                    className={emptyClass}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 text-[10px] text-gray-500 dark:text-slate-500 justify-center flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-900/60" /> Disponível
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/60" /> Reservada
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/60" /> Confirmada
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-600" /> Corredor
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-700/60" /> Entrada
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-700/60" /> Saída
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-600 dark:bg-slate-900 border border-slate-400 dark:border-slate-700" /> Parede
              </div>
            </div>
          </div>

          {booths.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-slate-100 dark:border-slate-800 transition-colors">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Barracas ({booths.length})</h3>
              <div className="space-y-1">
                {booths.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={"min-w-[4.5rem] h-6 px-2 rounded-lg flex items-center justify-center text-[10px] font-bold whitespace-nowrap shadow-sm " + (b.status === 'confirmed' ? "bg-green-200 dark:bg-green-600/60 text-green-800 dark:text-green-100" : b.status === 'reserved' ? "bg-yellow-200 dark:bg-yellow-600/60 text-yellow-800 dark:text-yellow-100" : "bg-purple-200 dark:bg-purple-600/60 text-purple-800 dark:text-purple-100")}>
                        {b.label}
                      </span>
                      <span className="text-gray-700 dark:text-slate-300 font-medium">{b.vendors?.name || 'Vaga'}</span>
                    </div>
                    <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors " + (b.status === 'confirmed' ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" : b.status === 'reserved' ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400")}>
                      {b.status === 'confirmed' ? 'Confirmada' : b.status === 'reserved' ? 'Reservada' : 'Disponível'}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 text-center border border-slate-100 dark:border-slate-800 transition-colors">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Faturamento Total do Evento</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {revenueData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-600 transition-colors">
              <DollarSign className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Nenhuma barraca vinculada a este evento.</p>
            </div>
          ) : (
            revenueData
              .sort((a, b) => b.revenue - a.revenue)
              .map(item => (
                <div key={item.vendorId} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800 transition-colors">
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
