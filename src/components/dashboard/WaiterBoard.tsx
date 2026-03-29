'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import {
  Bell, CheckCircle, Clock, History, LayoutGrid, Users,
  Merge, Split, Trash2, Plus, UserCheck, PhoneCall,
  ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';
import type { VendorTable, QueueEntry, TableStatus } from '@/types/database';

interface WaiterCall {
  id: string;
  vendor_id: string;
  table_number: string;
  status: 'pending' | 'attended';
  created_at: string;
  attended_at: string | null;
}

interface ReadyOrder {
  id: string;
  pickup_code: string;
  table_number: string | null;
  total_price: number;
  created_at: string;
  order_items: { id: string; quantity: number; menu_items: { name: string } | null }[];
}

interface Props {
  initialReadyOrders: ReadyOrder[];
  initialWaiterCalls: WaiterCall[];
  initialTables: VendorTable[];
  initialQueue: QueueEntry[];
  vendorId: string;
  hasTableManagement?: boolean;
}

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string; dot: string; label: string }> = {
  free:     { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Livre' },
  occupied: { bg: 'bg-gray-100',    border: 'border-gray-300',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Ocupada' },
  dirty:    { bg: 'bg-amber-50',    border: 'border-amber-300',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Limpeza' },
  reserved: { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-600',    dot: 'bg-blue-400',    label: 'Reservada' },
};

export default function WaiterBoard({ initialReadyOrders, initialWaiterCalls, initialTables, initialQueue, vendorId, hasTableManagement = false }: Props) {
  const [orders, setOrders] = useState<ReadyOrder[]>(initialReadyOrders);
  const [calls, setCalls] = useState<WaiterCall[]>(initialWaiterCalls);
  const [tables, setTables] = useState<VendorTable[]>(initialTables);
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue);
  const [activeTab, setActiveTab] = useState<'tables' | 'queue' | 'pending' | 'history'>(hasTableManagement ? 'tables' : 'pending');

  // Modal states
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [dragOverTable, setDragOverTable] = useState<string | null>(null);
  const tablesGridRef = useRef<HTMLDivElement>(null);

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectedTable && tablesGridRef.current && !tablesGridRef.current.contains(e.target as Node)) {
        setSelectedTable(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedTable]);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    audio.preload = 'auto';
    audio.load();
    audioRef.current = audio;
    function onInteraction() {
      audio.volume = 0;
      audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.volume = 1; }).catch(() => {});
    }
    window.addEventListener('click', onInteraction, { once: true });
    window.addEventListener('touchstart', onInteraction, { once: true });
    return () => { window.removeEventListener('click', onInteraction); window.removeEventListener('touchstart', onInteraction); };
  }, []);

  const playSound = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.currentTime = 0; audio.volume = 1; audio.play().catch(() => {}); }
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`waiter-full-${vendorId}`)
      // Orders
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendorId}` }, async (payload) => {
        const updated = payload.new;
        if (updated.status === 'ready' && updated.table_number) {
          const { data } = await supabase.from('orders').select(`*, order_items(id, quantity, menu_items(name))`).eq('id', updated.id).single();
          if (data) setOrders(prev => [data as ReadyOrder, ...prev.filter(o => o.id !== data.id)]);
        } else if (updated.status === 'delivered') {
          setOrders(prev => prev.filter(o => o.id !== updated.id));
        }
      })
      // Waiter calls
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `vendor_id=eq.${vendorId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCalls(prev => [payload.new as WaiterCall, ...prev]);
          playSound();
        } else if (payload.eventType === 'UPDATE') {
          setCalls(prev => prev.map(c => c.id === (payload.new as WaiterCall).id ? payload.new as WaiterCall : c));
        } else if (payload.eventType === 'DELETE') {
          setCalls(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      // Tables
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_tables', filter: `vendor_id=eq.${vendorId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTables(prev => [...prev, payload.new as VendorTable].sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true })));
        } else if (payload.eventType === 'UPDATE') {
          setTables(prev => prev.map(t => t.id === (payload.new as VendorTable).id ? payload.new as VendorTable : t));
        } else if (payload.eventType === 'DELETE') {
          setTables(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      // Queue
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries', filter: `vendor_id=eq.${vendorId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setQueue(prev => [...prev, payload.new as QueueEntry].sort((a, b) => a.position - b.position));
          playSound();
        } else if (payload.eventType === 'UPDATE') {
          setQueue(prev => prev.map(q => q.id === (payload.new as QueueEntry).id ? payload.new as QueueEntry : q));
        } else if (payload.eventType === 'DELETE') {
          setQueue(prev => prev.filter(q => q.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendorId, playSound]);

  const supabase = createClient();

  // === TABLE ACTIONS ===
  async function addTable() {
    if (!newTableNumber.trim()) return;
    const { error } = await supabase.from('vendor_tables').insert({
      vendor_id: vendorId,
      table_number: newTableNumber.trim(),
      capacity: newTableCapacity,
      status: 'free',
    });
    if (error) {
      console.error('Erro ao adicionar mesa:', error);
      alert(`Erro ao adicionar mesa: ${error.message}`);
      return;
    }
    setNewTableNumber('');
    setNewTableCapacity(4);
    setShowAddTable(false);
  }

  async function removeTable(tableId: string) {
    if (!confirm('Remover esta mesa?')) return;
    await supabase.from('vendor_tables').delete().eq('id', tableId);
  }

  async function updateTableStatus(tableId: string, status: TableStatus) {
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === 'occupied') updates.occupied_at = new Date().toISOString();
    if (status === 'free') { updates.occupied_at = null; updates.merged_with = null; }
    await supabase.from('vendor_tables').update(updates).eq('id', tableId);
    // Se liberou, desfaz merge
    if (status === 'free') {
      await supabase.from('vendor_tables').update({ merged_with: null }).eq('merged_with', tableId);
    }
    setSelectedTable(null);
  }

  async function updateTableCapacity(tableId: string, capacity: number) {
    await supabase.from('vendor_tables').update({ capacity, updated_at: new Date().toISOString() }).eq('id', tableId);
  }

  async function mergeTables(sourceId: string, targetId: string) {
    // Marca a source como "merged_with" target
    await supabase.from('vendor_tables').update({
      merged_with: targetId,
      status: 'occupied',
      occupied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', sourceId);
    // Marca target como occupied também
    await supabase.from('vendor_tables').update({
      status: 'occupied',
      occupied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', targetId);
    setMergeSource(null);
  }

  async function splitTable(tableId: string) {
    // Encontra mesas mergeadas com esta
    const merged = tables.filter(t => t.merged_with === tableId);
    const ids = [tableId, ...merged.map(m => m.id)];
    // Volta todas ao layout original: sem merge, status dirty (precisa limpar)
    for (const id of ids) {
      await supabase.from('vendor_tables').update({
        merged_with: null,
        status: 'dirty',
        occupied_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    }
    setSelectedTable(null);
  }

  // === QUEUE ACTIONS ===
  async function callNextInQueue(queueId: string) {
    await supabase.from('queue_entries').update({
      status: 'called',
      called_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
  }

  async function seatFromQueue(queueId: string, tableId: string) {
    await supabase.from('queue_entries').update({
      status: 'seated',
      seated_at: new Date().toISOString(),
      table_id: tableId,
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
    await updateTableStatus(tableId, 'occupied');
  }

  async function markNoShow(queueId: string) {
    await supabase.from('queue_entries').update({
      status: 'no_show',
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
  }

  async function cancelQueueEntry(queueId: string) {
    await supabase.from('queue_entries').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
  }

  // === WAITER CALL ACTIONS ===
  async function attendCall(callId: string) {
    const { error } = await supabase.from('waiter_calls')
      .update({ status: 'attended', attended_at: new Date().toISOString() })
      .eq('id', callId);
    if (!error) {
      setCalls(prev => prev.map(c => c.id === callId ? { ...c, status: 'attended' as const, attended_at: new Date().toISOString() } : c));
    }
  }

  async function markDelivered(orderId: string) {
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    if (!error) setOrders(prev => prev.filter(o => o.id !== orderId));
  }

  function getDuration(start: string, end: string | null) {
    if (!end) return '...';
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  }

  // Derived data
  const pendingCalls = calls.filter(c => c.status === 'pending');
  const historyCalls = calls.filter(c => c.status === 'attended').slice(0, 20);
  const callingTables = new Set(pendingCalls.map(c => c.table_number));
  const waitingQueue = queue.filter(q => q.status === 'waiting');
  const calledQueue = queue.filter(q => q.status === 'called');
  const freeTables = tables.filter(t => t.status === 'free');

  // Merge groups: agrupa mesas que estão mergeadas
  const mergeGroups = new Map<string, VendorTable[]>();
  for (const t of tables) {
    if (t.merged_with) {
      const group = mergeGroups.get(t.merged_with) || [];
      group.push(t);
      mergeGroups.set(t.merged_with, group);
    }
  }

  function getMergedCapacity(table: VendorTable): number {
    const merged = mergeGroups.get(table.id) || [];
    return table.capacity + merged.reduce((sum, m) => sum + m.capacity, 0);
  }

  function getMergedNumbers(table: VendorTable): string[] {
    const merged = mergeGroups.get(table.id) || [];
    return merged.map(m => m.table_number);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-2 space-y-4">

      {/* Abas */}
      <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {([
          ...(hasTableManagement ? [
            { key: 'tables' as const, icon: LayoutGrid, label: 'Mesas', badge: callingTables.size > 0 ? callingTables.size : null, badgeColor: 'bg-red-500' },
            { key: 'queue' as const, icon: Users, label: 'Fila', badge: waitingQueue.length > 0 ? waitingQueue.length : null, badgeColor: 'bg-purple-500' },
          ] : []),
          { key: 'pending' as const, icon: Bell, label: 'Pendentes', badge: pendingCalls.length + orders.length > 0 ? pendingCalls.length + orders.length : null, badgeColor: 'bg-orange-500' },
          { key: 'history' as const, icon: History, label: 'Histórico', badge: null, badgeColor: '' },
        ]).map(({ key, icon: Icon, label, badge, badgeColor }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${activeTab === key ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge && (
              <span className={`${badgeColor} text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full ${key === 'tables' ? 'animate-pulse' : ''}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* === ABA: MESAS === */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          {/* Legenda + Adicionar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wide">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Livre</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Ocupada</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Junta</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Limpeza</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Chamando</span>
            </div>
            <button onClick={() => setShowAddTable(!showAddTable)} className="text-[10px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Plus className="w-3 h-3" /> Mesa
            </button>
          </div>

          {/* Form adicionar mesa */}
          {showAddTable && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Nº da Mesa</label>
                  <input type="text" value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} placeholder="Ex: 1" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Capacidade (pessoas)</label>
                  <input type="number" min={1} max={50} value={newTableCapacity} onChange={e => setNewTableCapacity(parseInt(e.target.value) || 1)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                </div>
              </div>
              <button onClick={addTable} className="w-full bg-orange-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-orange-600 transition">Adicionar Mesa</button>
            </div>
          )}

          {/* Merge mode banner */}
          {mergeSource && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between animate-in fade-in duration-200">
              <p className="text-xs font-bold text-blue-700">
                <Merge className="w-4 h-4 inline mr-1" />
                Selecione a mesa para juntar com a Mesa {tables.find(t => t.id === mergeSource)?.table_number}
              </p>
              <button onClick={() => setMergeSource(null)} className="text-xs text-blue-500 font-bold">Cancelar</button>
            </div>
          )}

          {/* Grid de mesas */}
          {tables.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
              <p className="text-3xl mb-2">🪑</p>
              <p className="text-xs font-medium">Nenhuma mesa cadastrada</p>
              <p className="text-[10px] mt-1">Clique em "+ Mesa" para começar</p>
            </div>
          ) : (
            <div ref={tablesGridRef} className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {tables.map(table => {
                const isCalling = callingTables.has(table.table_number);
                const callForTable = isCalling ? pendingCalls.find(c => c.table_number === table.table_number) : null;
                const isMergedChild = !!table.merged_with;
                const isMergeParent = !isMergedChild && (mergeGroups.get(table.id)?.length ?? 0) > 0;
                const hasMerge = isMergeParent;
                const mergedNums = isMergeParent ? getMergedNumbers(table) : [];
                const totalCapacity = isMergeParent ? getMergedCapacity(table) : table.capacity;
                const mergeParent = isMergedChild ? tables.find(t => t.id === table.merged_with) : null;
                const isSelected = selectedTable === table.id;

                // Cor: chamando > mergeado (azul) > status normal
                const MERGE_STYLE = { bg: 'bg-indigo-50', border: 'border-indigo-300 border-dashed', text: 'text-indigo-600', dot: 'bg-indigo-400', label: 'Junta' };
                const style = isCalling
                  ? { bg: 'bg-red-50', border: 'border-red-300 shadow-md shadow-red-100', text: 'text-red-700', dot: 'bg-red-500 animate-pulse', label: 'Chamando!' }
                  : (isMergedChild || isMergeParent) ? MERGE_STYLE
                  : STATUS_COLORS[table.status];

                const isDragOver = dragOverTable === table.id;

                return (
                  <div key={table.id} className="space-y-0">
                    <div
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('table-id', table.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverTable !== table.id) setDragOverTable(table.id);
                      }}
                      onDragLeave={() => setDragOverTable(null)}
                      onDrop={e => {
                        e.preventDefault();
                        setDragOverTable(null);
                        const sourceId = e.dataTransfer.getData('table-id');
                        if (sourceId && sourceId !== table.id) {
                          mergeTables(sourceId, table.id);
                        }
                      }}
                      onClick={() => {
                        if (mergeSource && mergeSource !== table.id) {
                          mergeTables(mergeSource, table.id);
                          return;
                        }
                        setSelectedTable(isSelected ? null : table.id);
                      }}
                      className={`relative border-2 rounded-2xl p-2.5 text-center transition-all cursor-grab active:cursor-grabbing ${style.bg} ${style.border} ${isSelected ? 'ring-2 ring-orange-400' : ''} ${isDragOver ? 'ring-2 ring-blue-400 scale-105' : ''}`}
                    >
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${style.dot}`} />

                      {/* Badge de merge no parent */}
                      {isMergeParent && (
                        <span className="absolute top-1 left-1 bg-indigo-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Merge className="w-2.5 h-2.5" /> {mergedNums.length + 1}
                        </span>
                      )}

                      {/* Ícone de link no filho */}
                      {isMergedChild && mergeParent && (
                        <span className="absolute top-1 left-1 bg-indigo-400 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">
                          <ArrowRight className="w-2.5 h-2.5 inline" /> {mergeParent.table_number}
                        </span>
                      )}

                      {/* Número da mesa */}
                      <p className={`text-xl font-black ${style.text} leading-none`}>
                        {table.table_number}
                      </p>

                      {/* Parent: mostra capacidade total */}
                      {isMergeParent && (
                        <p className="text-[9px] font-bold text-indigo-500 leading-tight">
                          +{mergedNums.join('+')} = {totalCapacity}p
                        </p>
                      )}

                      {/* Capacidade individual */}
                      {!isMergeParent && (
                        <div className={`flex items-center justify-center gap-0.5 mt-1 ${style.text} opacity-60`}>
                          <Users className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-black">{table.capacity}p</span>
                        </div>
                      )}

                      <p className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 ${style.text} opacity-50`}>{style.label}</p>

                      {/* Botão atender chamada */}
                      {isCalling && callForTable && (
                        <button
                          onClick={e => { e.stopPropagation(); attendCall(callForTable.id); }}
                          className="mt-1.5 w-full bg-red-500 text-white text-[9px] font-black py-1.5 rounded-lg hover:bg-red-600 transition active:scale-95 uppercase"
                        >
                          Atender
                        </button>
                      )}
                    </div>

                    {/* Menu de ações expandido */}
                    {isSelected && (
                      <div className="bg-white border border-gray-200 rounded-xl p-2 mt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 shadow-lg"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Mesa filha (mergeada) — mostra apenas info */}
                        {isMergedChild && mergeParent && (
                          <div className="text-center py-1">
                            <p className="text-[10px] font-bold text-indigo-600">Junta com Mesa {mergeParent.table_number}</p>
                            <p className="text-[9px] text-gray-400">Separe pela mesa principal</p>
                          </div>
                        )}

                        {/* Botão destaque: Liberar & Separar (parent mergeado) */}
                        {isMergeParent && (
                          <button
                            onClick={() => { splitTable(table.id); setSelectedTable(null); }}
                            className="w-full text-[10px] font-black bg-indigo-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition"
                          >
                            <Split className="w-3.5 h-3.5" /> Separar Mesas
                          </button>
                        )}

                        {/* Capacidade edit (não para filhas) */}
                        {!isMergedChild && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-500">Capacidade</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateTableCapacity(table.id, Math.max(1, table.capacity - 1))} className="w-6 h-6 bg-gray-100 rounded-lg text-xs font-bold flex items-center justify-center">-</button>
                              <span className="text-xs font-black w-6 text-center">{table.capacity}</span>
                              <button onClick={() => updateTableCapacity(table.id, table.capacity + 1)} className="w-6 h-6 bg-gray-100 rounded-lg text-xs font-bold flex items-center justify-center">+</button>
                            </div>
                          </div>
                        )}

                        {/* Status buttons (não para mergeadas) */}
                        {!isMergedChild && !isMergeParent && (
                          <div className="grid grid-cols-2 gap-1">
                            {table.status !== 'free' && (
                              <button onClick={() => updateTableStatus(table.id, 'free')} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 py-1.5 rounded-lg">Liberar</button>
                            )}
                            {table.status === 'free' && (
                              <button onClick={() => updateTableStatus(table.id, 'occupied')} className="text-[9px] font-bold bg-gray-100 text-gray-700 py-1.5 rounded-lg">Ocupar</button>
                            )}
                            {table.status === 'occupied' && (
                              <button onClick={() => updateTableStatus(table.id, 'dirty')} className="text-[9px] font-bold bg-amber-50 text-amber-700 py-1.5 rounded-lg">Limpeza</button>
                            )}
                            {table.status === 'dirty' && (
                              <button onClick={() => updateTableStatus(table.id, 'free')} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 py-1.5 rounded-lg">Limpa!</button>
                            )}
                          </div>
                        )}

                        {/* Ações inferiores */}
                        <div className="flex gap-1">
                          {!isMergedChild && !isMergeParent && table.status !== 'free' && (
                            <button onClick={() => { setMergeSource(table.id); setSelectedTable(null); }} className="flex-1 text-[9px] font-bold bg-blue-50 text-blue-700 py-1.5 rounded-lg flex items-center justify-center gap-0.5">
                              <Merge className="w-3 h-3" /> Juntar
                            </button>
                          )}
                          {!isMergedChild && (
                            <button onClick={() => removeTable(table.id)} className="text-[9px] font-bold bg-red-50 text-red-500 py-1.5 px-2 rounded-lg">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pedidos prontos */}
          {orders.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                <CheckCircle className="w-4 h-4 text-green-500" /> Pronto para entregar ({orders.length})
              </h2>
              <div className="space-y-2">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-black text-gray-900 text-sm">COD: {order.pickup_code}</p>
                      {order.table_number && <p className="text-orange-600 font-black text-xs italic">MESA {order.table_number}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{order.order_items.map(i => `${i.quantity}x ${i.menu_items?.name}`).join(', ')}</p>
                    </div>
                    <button onClick={() => markDelivered(order.id)} className="bg-green-500 text-white text-[10px] font-black px-3 py-2 rounded-xl hover:bg-green-600 transition">ENTREGUE</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* === ABA: FILA DE ESPERA === */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-emerald-700">{freeTables.length}</p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase">Livres</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-purple-700">{waitingQueue.length}</p>
              <p className="text-[9px] font-bold text-purple-600 uppercase">Na fila</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-amber-700">{calledQueue.length}</p>
              <p className="text-[9px] font-bold text-amber-600 uppercase">Chamados</p>
            </div>
          </div>

          {/* Chamados (precisam ser alocados) */}
          {calledQueue.length > 0 && (
            <section>
              <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4" /> Chamados — aguardando mesa
              </h2>
              <div className="space-y-2">
                {calledQueue.map(entry => (
                  <div key={entry.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-black text-amber-800">{entry.customer_name}</p>
                        <p className="text-[10px] text-amber-500 font-bold">{entry.party_size} pessoa{entry.party_size > 1 ? 's' : ''} • Pos #{entry.position}</p>
                      </div>
                      <button onClick={() => markNoShow(entry.id)} className="text-[10px] text-red-500 font-bold border border-red-200 px-2 py-1 rounded-lg">Não veio</button>
                    </div>
                    {/* Mesas disponíveis para sentar */}
                    {freeTables.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {freeTables.filter(t => getMergedCapacity(t) >= entry.party_size || freeTables.length <= 2).map(t => (
                          <button key={t.id} onClick={() => seatFromQueue(entry.id, t.id)}
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition ${getMergedCapacity(t) >= entry.party_size ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            Mesa {t.table_number} ({t.capacity}p)
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-500 italic">Nenhuma mesa livre no momento</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fila de espera */}
          <section>
            <h2 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Fila de espera ({waitingQueue.length})
            </h2>
            {waitingQueue.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                <p className="text-3xl mb-1">🎉</p>
                <p className="text-xs font-medium">Nenhum cliente na fila</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waitingQueue.map((entry, i) => (
                  <div key={entry.id} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-black text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{entry.customer_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">
                          {entry.party_size} pessoa{entry.party_size > 1 ? 's' : ''}
                          {entry.customer_phone && ` • ${entry.customer_phone}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => callNextInQueue(entry.id)}
                        className="bg-purple-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-purple-600 transition">
                        Chamar
                      </button>
                      <button onClick={() => cancelQueueEntry(entry.id)}
                        className="text-[10px] text-red-400 font-bold px-2 py-1.5">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* === ABA: PENDENTES === */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <section>
            <h2 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Chamadas de mesa ({pendingCalls.length})</h2>
            {pendingCalls.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                <p className="text-3xl mb-1">🛎️</p><p className="text-xs">Nenhuma mesa chamando.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingCalls.map(call => (
                  <div key={call.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-black text-red-700 text-xl italic">MESA {call.table_number}</p>
                      <p className="text-[10px] text-red-400 font-bold uppercase">{formatDate(call.created_at)}</p>
                    </div>
                    <button onClick={() => attendCall(call.id)} className="bg-red-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-red-700 transition active:scale-95">ATENDER</button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              <CheckCircle className="w-4 h-4 text-green-500" /> Pronto para entregar ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                <p className="text-3xl mb-1">🏃‍♂️</p><p className="text-xs">Tudo entregue!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-black text-gray-900">COD: {order.pickup_code}</p>
                        {order.table_number && <p className="text-orange-600 font-black text-sm italic">MESA {order.table_number}</p>}
                      </div>
                      <button onClick={() => markDelivered(order.id)} className="bg-green-500 text-white text-[11px] font-black px-4 py-2 rounded-xl hover:bg-green-600 transition">ENTREGUE</button>
                    </div>
                    <div className="text-[11px] text-gray-500 space-y-0.5 border-t border-gray-50 pt-2">
                      {order.order_items.map(item => (<p key={item.id} className="font-medium">• {item.quantity}x {item.menu_items?.name ?? 'Item'}</p>))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* === ABA: HISTÓRICO === */}
      {activeTab === 'history' && (
        <section className="space-y-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Últimos atendimentos</h3>
          {historyCalls.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Sem histórico.</div>
          ) : (
            <div className="space-y-2">
              {historyCalls.map(call => (
                <div key={call.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between opacity-80">
                  <div>
                    <p className="font-bold text-gray-800">Mesa {call.table_number}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(call.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Resposta</p>
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{getDuration(call.created_at, call.attended_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
