'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo, useTransition, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import {
  Bell, CheckCircle, Clock, History, LayoutGrid, Users,
  Merge, Split, Trash2, Plus, UserCheck, PhoneCall,
  ChevronDown, ChevronUp, ArrowRight, MessageCircle, Send,
  ScanLine, X, ShoppingBag
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
  free:     { bg: 'bg-emerald-50 dark:bg-emerald-950/20',  border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400', label: 'Livre' },
  occupied: { bg: 'bg-gray-100 dark:bg-slate-800',    border: 'border-gray-300 dark:border-slate-700',    text: 'text-gray-600 dark:text-slate-400',    dot: 'bg-gray-400',    label: 'Ocupada' },
  dirty:    { bg: 'bg-amber-50 dark:bg-amber-950/20',     border: 'border-amber-300 dark:border-amber-800',    text: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-400',   label: 'Limpeza' },
  reserved: { bg: 'bg-blue-50 dark:bg-blue-950/20',      border: 'border-blue-200 dark:border-blue-800',     text: 'text-blue-600 dark:text-blue-400',    dot: 'bg-blue-400',    label: 'Reservada' },
};

const MERGE_STYLE = { bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-300 dark:border-indigo-800 border-dashed', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-400', label: 'Junta' };

// === MEMOIZED TABLE CARD ===
interface TableCardProps {
  table: VendorTable;
  isSelected: boolean;
  isCalling: boolean;
  callId: string | null;
  isMergedChild: boolean;
  isMergeParent: boolean;
  mergedNums: string[];
  totalCapacity: number;
  mergeParentNumber: string | null;
  isDragOver: boolean;
  confirmingDelete: boolean;
  onSelect: (id: string) => void;
  onMerge: (sourceId: string, targetId: string) => void;
  onRemove: (id: string) => void;
  onConfirmDelete: (id: string | null) => void;
  onUpdateStatus: (id: string, status: TableStatus) => void;
  onUpdateCapacity: (id: string, capacity: number) => void;
  onSplit: (id: string) => void;
  onSetMergeSource: (id: string) => void;
  onAttendCall: (callId: string) => void;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragOver: (id: string, e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (id: string, e: React.DragEvent) => void;
  mergeSourceId: string | null;
}

const TableCard = memo(function TableCard({
  table, isSelected, isCalling, callId, isMergedChild, isMergeParent,
  mergedNums, totalCapacity, mergeParentNumber, isDragOver, confirmingDelete,
  onSelect, onMerge, onRemove, onConfirmDelete, onUpdateStatus, onUpdateCapacity,
  onSplit, onSetMergeSource, onAttendCall, onDragStart, onDragOver, onDragLeave, onDrop,
  mergeSourceId,
}: TableCardProps) {
  const style = isCalling
    ? { bg: 'bg-red-50', border: 'border-red-300 shadow-md shadow-red-100', text: 'text-red-700', dot: 'bg-red-500 animate-pulse', label: 'Chamando!' }
    : (isMergedChild || isMergeParent) ? MERGE_STYLE
    : STATUS_COLORS[table.status];

  return (
    <div className="space-y-0">
      <div
        draggable
        onDragStart={e => onDragStart(table.id, e)}
        onDragOver={e => onDragOver(table.id, e)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(table.id, e)}
        onClick={() => {
          if (mergeSourceId && mergeSourceId !== table.id) {
            onMerge(mergeSourceId, table.id);
            return;
          }
          onSelect(table.id);
        }}
        className={`relative border-2 rounded-2xl p-2.5 text-center transition-all cursor-grab active:cursor-grabbing ${style.bg} ${style.border} ${isSelected ? 'ring-2 ring-orange-400' : ''} ${isDragOver ? 'ring-2 ring-blue-400 scale-105' : ''}`}
      >
        <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${style.dot}`} />

        {isMergeParent && (
          <span className="absolute top-1 left-1 bg-indigo-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Merge className="w-2.5 h-2.5" /> {mergedNums.length + 1}
          </span>
        )}

        {isMergedChild && mergeParentNumber && (
          <span className="absolute top-1 left-1 bg-indigo-400 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">
            <ArrowRight className="w-2.5 h-2.5 inline" /> {mergeParentNumber}
          </span>
        )}

        <p className={`text-xl font-black ${style.text} leading-none`}>{table.table_number}</p>

        {isMergeParent && (
          <p className="text-[9px] font-bold text-indigo-500 leading-tight">
            +{mergedNums.join('+')} = {totalCapacity}p
          </p>
        )}

        {!isMergeParent && (
          <div className={`flex items-center justify-center gap-0.5 mt-1 ${style.text} opacity-60`}>
            <Users className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">{table.capacity}p</span>
          </div>
        )}

        <p className={`text-[8px] font-bold uppercase tracking-wider mt-0.5 ${style.text} opacity-50`}>{style.label}</p>

        {isCalling && callId && (
          <button
            onClick={e => { e.stopPropagation(); onAttendCall(callId); }}
            className="mt-1.5 w-full bg-red-500 text-white text-[9px] font-black py-1.5 rounded-lg hover:bg-red-600 transition active:scale-95 uppercase"
          >
            Atender
          </button>
        )}
      </div>

      {isSelected && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-2 mt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          {isMergedChild && mergeParentNumber && (
            <div className="text-center py-1">
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Junta com Mesa {mergeParentNumber}</p>
              <p className="text-[9px] text-gray-400 dark:text-slate-500">Separe pela mesa principal</p>
            </div>
          )}

          {isMergeParent && (
            <button
              onClick={() => onSplit(table.id)}
              className="w-full text-[10px] font-black bg-indigo-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition"
            >
              <Split className="w-3.5 h-3.5" /> Separar Mesas
            </button>
          )}

          {!isMergedChild && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">Capacidade</span>
              <div className="flex items-center gap-1">
                <button onClick={() => onUpdateCapacity(table.id, Math.max(1, table.capacity - 1))} className="w-6 h-6 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-center text-slate-900 dark:text-white">-</button>
                <span className="text-xs font-black w-6 text-center text-slate-900 dark:text-white">{table.capacity}</span>
                <button onClick={() => onUpdateCapacity(table.id, table.capacity + 1)} className="w-6 h-6 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-center text-slate-900 dark:text-white">+</button>
              </div>
            </div>
          )}

          {!isMergedChild && !isMergeParent && (
            <div className="grid grid-cols-2 gap-1">
              {table.status !== 'free' && (
                <button onClick={() => onUpdateStatus(table.id, 'free')} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 py-1.5 rounded-lg">Liberar</button>
              )}
              {table.status === 'free' && (
                <button onClick={() => onUpdateStatus(table.id, 'occupied')} className="text-[9px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 py-1.5 rounded-lg">Ocupar</button>
              )}
              {table.status === 'occupied' && (
                <button onClick={() => onUpdateStatus(table.id, 'dirty')} className="text-[9px] font-bold bg-amber-50 text-amber-700 py-1.5 rounded-lg">Limpeza</button>
              )}
              {table.status === 'dirty' && (
                <button onClick={() => onUpdateStatus(table.id, 'free')} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 py-1.5 rounded-lg">Limpa!</button>
              )}
            </div>
          )}

          <div className="flex gap-1">
            {!isMergedChild && !isMergeParent && table.status !== 'free' && (
              <button onClick={() => onSetMergeSource(table.id)} className="flex-1 text-[9px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-1.5 rounded-lg flex items-center justify-center gap-0.5">
                <Merge className="w-3 h-3" /> Juntar
              </button>
            )}
            {!isMergedChild && (
              confirmingDelete ? (
                <button onClick={() => onRemove(table.id)} className="text-[9px] font-black bg-red-500 text-white py-1.5 px-3 rounded-lg animate-pulse">
                  Confirmar?
                </button>
              ) : (
                <button onClick={() => onConfirmDelete(table.id)} className="text-[9px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 py-1.5 px-2 rounded-lg">
                  <Trash2 className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default function WaiterBoard({ initialReadyOrders, initialWaiterCalls, initialTables, initialQueue, vendorId, hasTableManagement = false }: Props) {
  const [orders, setOrders] = useState<ReadyOrder[]>(initialReadyOrders);
  const [calls, setCalls] = useState<WaiterCall[]>(initialWaiterCalls);
  const [tables, setTables] = useState<VendorTable[]>(initialTables);
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue);
  const [activeTab, setActiveTab] = useState<'tables' | 'queue' | 'pending' | 'history' | 'scan'>(hasTableManagement ? 'tables' : 'pending');
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(2);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [dragOverTable, setDragOverTable] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const tablesGridRef = useRef<HTMLDivElement>(null);

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectedTable && tablesGridRef.current && !tablesGridRef.current.contains(e.target as Node)) {
        setSelectedTable(null);
        setConfirmingDelete(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedTable]);

  // Reset confirmingDelete when selection changes
  useEffect(() => {
    setConfirmingDelete(null);
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

  const supabase = useMemo(() => createClient(), []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`waiter-full-${vendorId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${vendorId}` }, async (payload) => {
        const updated = payload.new;
        if (updated.status === 'ready' && updated.table_number) {
          const { data } = await supabase.from('orders').select(`*, order_items(id, quantity, menu_items(name))`).eq('id', updated.id).single();
          if (data) setOrders(prev => [data as ReadyOrder, ...prev.filter(o => o.id !== data.id)]);
        } else if (updated.status === 'delivered') {
          setOrders(prev => prev.filter(o => o.id !== updated.id));
        }
      })
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_tables', filter: `vendor_id=eq.${vendorId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTables(prev => [...prev, payload.new as VendorTable].sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true })));
        } else if (payload.eventType === 'UPDATE') {
          setTables(prev => prev.map(t => t.id === (payload.new as VendorTable).id ? payload.new as VendorTable : t));
        } else if (payload.eventType === 'DELETE') {
          setTables(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
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
  }, [vendorId, playSound, supabase]);

  // === TABLE ACTIONS ===
  const addTable = useCallback(async () => {
    if (!newTableNumber.trim()) return;
    const { error } = await supabase.from('vendor_tables').insert({
      vendor_id: vendorId,
      table_number: newTableNumber.trim(),
      capacity: newTableCapacity,
      status: 'free',
    });
    if (error) {
      alert(`Erro ao adicionar mesa: ${error.message}`);
      return;
    }
    setNewTableNumber('');
    setNewTableCapacity(2);
    setShowAddTable(false);
  }, [supabase, vendorId, newTableNumber, newTableCapacity]);

  const removeTable = useCallback(async (tableId: string) => {
    // Optimistic: remove imediatamente da UI
    setTables(prev => prev.filter(t => t.id !== tableId));
    setSelectedTable(null);
    setConfirmingDelete(null);
    const { error } = await supabase.from('vendor_tables').delete().eq('id', tableId);
    if (error) {
      alert(`Erro ao remover mesa: ${error.message}`);
      const { data } = await supabase.from('vendor_tables').select('*').eq('vendor_id', vendorId);
      if (data) setTables(data.sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true })));
    }
  }, [supabase, vendorId]);

  const updateTableStatus = useCallback(async (tableId: string, status: TableStatus) => {
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === 'occupied') updates.occupied_at = new Date().toISOString();
    if (status === 'free') { updates.occupied_at = null; updates.merged_with = null; }
    await supabase.from('vendor_tables').update(updates).eq('id', tableId);
    if (status === 'free') {
      await supabase.from('vendor_tables').update({ merged_with: null }).eq('merged_with', tableId);
    }
    setSelectedTable(null);
  }, [supabase]);

  const updateTableCapacity = useCallback(async (tableId: string, capacity: number) => {
    await supabase.from('vendor_tables').update({ capacity, updated_at: new Date().toISOString() }).eq('id', tableId);
  }, [supabase]);

  const mergeTables = useCallback(async (sourceId: string, targetId: string) => {
    await supabase.from('vendor_tables').update({
      merged_with: targetId,
      status: 'occupied',
      occupied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', sourceId);
    await supabase.from('vendor_tables').update({
      status: 'occupied',
      occupied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', targetId);
    setMergeSource(null);
  }, [supabase]);

  const splitTable = useCallback(async (tableId: string) => {
    const merged = tables.filter(t => t.merged_with === tableId);
    const ids = [tableId, ...merged.map(m => m.id)];
    for (const id of ids) {
      await supabase.from('vendor_tables').update({
        merged_with: null,
        status: 'dirty',
        occupied_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    }
    setSelectedTable(null);
  }, [supabase, tables]);

  // === QUEUE ACTIONS ===
  const callNextInQueue = useCallback(async (queueId: string) => {
    await supabase.from('queue_entries').update({
      status: 'called',
      called_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
  }, [supabase]);

  const seatFromQueue = useCallback(async (queueId: string, tableId: string) => {
    await supabase.from('queue_entries').update({
      status: 'seated',
      seated_at: new Date().toISOString(),
      table_id: tableId,
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
    await updateTableStatus(tableId, 'occupied');
  }, [supabase, updateTableStatus]);

  const markNoShow = useCallback(async (queueId: string) => {
    await supabase.from('queue_entries').update({
      status: 'no_show',
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
  }, [supabase]);

  const cancelQueueEntry = useCallback(async (queueId: string) => {
    await supabase.from('queue_entries').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', queueId);
  }, [supabase]);

  // === WAITER CALL ACTIONS ===
  const attendCall = useCallback(async (callId: string) => {
    const { error } = await supabase.from('waiter_calls')
      .update({ status: 'attended', attended_at: new Date().toISOString() })
      .eq('id', callId);
    if (!error) {
      setCalls(prev => prev.map(c => c.id === callId ? { ...c, status: 'attended' as const, attended_at: new Date().toISOString() } : c));
    }
  }, [supabase]);

  // === SCAN CUSTOMER QR ===
  const [scannedCustomer, setScannedCustomer] = useState<{ id: string; name: string; email: string } | null>(null);
  const [scanError, setScanError] = useState('');

  const handleCustomerQrDetected = useCallback(async (rawData: string) => {
    setScanError('');
    try {
      const payload = JSON.parse(rawData);
      if (payload.type !== 'customer' || !payload.id) {
        setScanError('QR Code inválido. Peça ao cliente para mostrar o QR Code do QuickPick.');
        return;
      }
      // Buscar dados do cliente
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', payload.id)
        .single();
      if (error || !profile) {
        setScanError('Cliente não encontrado.');
        return;
      }
      setScannedCustomer(profile);
    } catch {
      setScanError('QR Code não reconhecido.');
    }
  }, [supabase]);

  // === MESSAGE TO TABLE ===
  const [msgModal, setMsgModal] = useState<{ table: string; callId: string } | null>(null);
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  const QUICK_MESSAGES = [
    'Seu pedido está sendo preparado!',
    'Pedido pronto! Estamos levando até você.',
    'Estamos a caminho da sua mesa!',
    'Aguarde um momento, por favor.',
    'Precisamos confirmar seu pedido.',
    'Sua mesa será liberada em breve.',
  ];

  const sendTableMessage = useCallback(async (message: string) => {
    if (!msgModal) return;
    setMsgSending(true);
    const { error } = await supabase.from('table_messages').insert({
      vendor_id: vendorId,
      table_number: msgModal.table,
      message,
    });
    setMsgSending(false);
    if (error) {
      alert(`Erro ao enviar mensagem: ${error.message}`);
    } else {
      setMsgSent(true);
      setTimeout(() => { setMsgModal(null); setMsgSent(false); }, 1500);
    }
  }, [supabase, vendorId, msgModal]);

  const markDelivered = useCallback(async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    if (!error) setOrders(prev => prev.filter(o => o.id !== orderId));
  }, [supabase]);

  const getDuration = useCallback((start: string, end: string | null) => {
    if (!end) return '...';
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  }, []);

  // === Derived data (memoized) ===
  const pendingCalls = useMemo(() => calls.filter(c => c.status === 'pending'), [calls]);
  const historyCalls = useMemo(() => calls.filter(c => c.status === 'attended').slice(0, 20), [calls]);
  const callingTables = useMemo(() => new Set(pendingCalls.map(c => c.table_number)), [pendingCalls]);
  const waitingQueue = useMemo(() => queue.filter(q => q.status === 'waiting'), [queue]);
  const calledQueue = useMemo(() => queue.filter(q => q.status === 'called'), [queue]);
  const freeTables = useMemo(() => tables.filter(t => t.status === 'free'), [tables]);

  // Merge groups
  const mergeGroups = useMemo(() => {
    const groups = new Map<string, VendorTable[]>();
    for (const t of tables) {
      if (t.merged_with) {
        const group = groups.get(t.merged_with) || [];
        group.push(t);
        groups.set(t.merged_with, group);
      }
    }
    return groups;
  }, [tables]);

  const getMergedCapacity = useCallback((table: VendorTable): number => {
    const merged = mergeGroups.get(table.id) || [];
    return table.capacity + merged.reduce((sum, m) => sum + m.capacity, 0);
  }, [mergeGroups]);

  const getMergedNumbers = useCallback((table: VendorTable): string[] => {
    const merged = mergeGroups.get(table.id) || [];
    return merged.map(m => m.table_number);
  }, [mergeGroups]);

  // Callbacks for TableCard
  const handleSelectTable = useCallback((id: string) => {
    setSelectedTable(prev => prev === id ? null : id);
  }, []);

  const handleSetMergeSource = useCallback((id: string) => {
    setMergeSource(id);
    setSelectedTable(null);
  }, []);

  const handleDragStart = useCallback((id: string, e: React.DragEvent) => {
    e.dataTransfer.setData('table-id', id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((id: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTable(prev => prev !== id ? id : prev);
  }, []);

  const handleDragLeave = useCallback(() => setDragOverTable(null), []);

  const handleDrop = useCallback((id: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTable(null);
    const sourceId = e.dataTransfer.getData('table-id');
    if (sourceId && sourceId !== id) {
      mergeTables(sourceId, id);
    }
  }, [mergeTables]);

  const handleConfirmDelete = useCallback((id: string | null) => {
    setConfirmingDelete(id);
  }, []);

  // Tab switch with transition
  const switchTab = useCallback((tab: typeof activeTab) => {
    startTransition(() => setActiveTab(tab));
  }, []);

  // Precomputed table data for memoized cards
  const tableCardData = useMemo(() => tables.map(table => {
    const isMergedChild = !!table.merged_with;
    const isMergeParent = !isMergedChild && (mergeGroups.get(table.id)?.length ?? 0) > 0;
    const mergeParent = isMergedChild ? tables.find(t => t.id === table.merged_with) : null;
    return {
      table,
      isCalling: callingTables.has(table.table_number),
      callId: callingTables.has(table.table_number) ? (pendingCalls.find(c => c.table_number === table.table_number)?.id ?? null) : null,
      isMergedChild,
      isMergeParent,
      mergedNums: isMergeParent ? getMergedNumbers(table) : [],
      totalCapacity: isMergeParent ? getMergedCapacity(table) : table.capacity,
      mergeParentNumber: mergeParent?.table_number ?? null,
    };
  }), [tables, callingTables, pendingCalls, mergeGroups, getMergedNumbers, getMergedCapacity]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-2 space-y-4">

      {/* Abas */}
      <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
        {([
          ...(hasTableManagement ? [
            { key: 'tables' as const, icon: LayoutGrid, label: 'Mesas', badge: callingTables.size > 0 ? callingTables.size : null, badgeColor: 'bg-red-500' },
            { key: 'queue' as const, icon: Users, label: 'Fila', badge: waitingQueue.length > 0 ? waitingQueue.length : null, badgeColor: 'bg-purple-500' },
          ] : []),
          { key: 'scan' as const, icon: ScanLine, label: 'Ler QR', badge: null, badgeColor: '' },
          { key: 'pending' as const, icon: Bell, label: 'Pendentes', badge: pendingCalls.length + orders.length > 0 ? pendingCalls.length + orders.length : null, badgeColor: 'bg-orange-500' },
          { key: 'history' as const, icon: History, label: 'Histórico', badge: null, badgeColor: '' },
        ]).map(({ key, icon: Icon, label, badge, badgeColor }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${activeTab === key ? 'bg-white dark:bg-slate-900 shadow-sm text-orange-600 dark:text-orange-500' : 'text-gray-500 dark:text-slate-400'}`}
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
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Livre</span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Ocupada</span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Junta</span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Limpeza</span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Chamando</span>
            </div>
            <button onClick={() => setShowAddTable(!showAddTable)} className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Plus className="w-3 h-3" /> Mesa
            </button>
          </div>

          {/* Form adicionar mesa */}
          {showAddTable && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 text-gray-400">
              <p className="text-3xl mb-2">🪑</p>
              <p className="text-xs font-medium">Nenhuma mesa cadastrada</p>
              <p className="text-[10px] mt-1">Clique em &quot;+ Mesa&quot; para começar</p>
            </div>
          ) : (
            <div ref={tablesGridRef} className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {tableCardData.map(({ table, isCalling, callId, isMergedChild, isMergeParent, mergedNums, totalCapacity, mergeParentNumber }) => (
                <TableCard
                  key={table.id}
                  table={table}
                  isSelected={selectedTable === table.id}
                  isCalling={isCalling}
                  callId={callId}
                  isMergedChild={isMergedChild}
                  isMergeParent={isMergeParent}
                  mergedNums={mergedNums}
                  totalCapacity={totalCapacity}
                  mergeParentNumber={mergeParentNumber}
                  isDragOver={dragOverTable === table.id}
                  confirmingDelete={confirmingDelete === table.id}
                  mergeSourceId={mergeSource}
                  onSelect={handleSelectTable}
                  onMerge={mergeTables}
                  onRemove={removeTable}
                  onConfirmDelete={handleConfirmDelete}
                  onUpdateStatus={updateTableStatus}
                  onUpdateCapacity={updateTableCapacity}
                  onSplit={splitTable}
                  onSetMergeSource={handleSetMergeSource}
                  onAttendCall={attendCall}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              ))}
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
                  <div key={order.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-black text-gray-900 dark:text-white text-sm">COD: {order.pickup_code}</p>
                      {order.table_number && <p className="text-orange-600 dark:text-orange-400 font-black text-xs italic">MESA {order.table_number}</p>}
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{order.order_items.map(i => `${i.quantity}x ${i.menu_items?.name}`).join(', ')}</p>
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
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{freeTables.length}</p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase">Livres</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-purple-700 dark:text-purple-400">{waitingQueue.length}</p>
              <p className="text-[9px] font-bold text-purple-600 uppercase">Na fila</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-amber-700 dark:text-amber-400">{calledQueue.length}</p>
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

      {/* === ABA: LER QR DO CLIENTE === */}
      {activeTab === 'scan' && (
        <div className="space-y-4">
          {!scannedCustomer ? (
            <>
              <div className="text-center">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Escanear QR do cliente</h3>
                <p className="text-xs text-gray-400">Aponte a câmera para o QR Code do cliente para registrar itens na conta dele</p>
              </div>
              {scanError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl text-center font-medium">{scanError}</div>
              )}
              <WaiterQrScanner onDetected={handleCustomerQrDetected} />
            </>
          ) : (
            <CustomerItemPanel
              customer={scannedCustomer}
              vendorId={vendorId}
              supabase={supabase}
              onClose={() => { setScannedCustomer(null); setScanError(''); }}
            />
          )}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMsgModal({ table: call.table_number, callId: call.id })}
                        className="bg-blue-500 text-white p-2.5 rounded-xl hover:bg-blue-600 transition active:scale-95"
                        title="Enviar mensagem para a mesa"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => attendCall(call.id)} className="bg-red-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-red-700 transition active:scale-95">ATENDER</button>
                    </div>
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

      {/* === MODAL: ENVIAR MENSAGEM PARA MESA === */}
      {msgModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5">
              {msgSent ? (
                <div className="text-center py-6 animate-in zoom-in duration-200">
                  <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="font-bold text-gray-900">Mensagem enviada!</p>
                  <p className="text-xs text-gray-400 mt-1">Mesa {msgModal.table} foi notificada com som</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-none">Mensagem</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Mesa {msgModal.table}</p>
                      </div>
                    </div>
                    <button onClick={() => setMsgModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Mensagens rápidas</p>
                  <div className="space-y-1.5 mb-4 max-h-52 overflow-y-auto">
                    {QUICK_MESSAGES.map((msg) => (
                      <button
                        key={msg}
                        onClick={() => sendTableMessage(msg)}
                        disabled={msgSending}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition text-sm text-gray-700 font-medium flex items-center justify-between gap-2 disabled:opacity-50"
                      >
                        <span>{msg}</span>
                        <Send className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>

                  <MessageCustomInput onSend={sendTableMessage} sending={msgSending} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Scanner de QR para garçom ─── */
function WaiterQrScanner({ onDetected }: { onDetected: (data: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeRef = useRef(true);
  const scanningRef = useRef(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    workerRef.current = new Worker('/qr-worker.js');
    return () => { workerRef.current?.terminate(); };
  }, []);

  const scanLoop = useCallback(() => {
    if (!activeRef.current) return;
    setTimeout(() => {
      if (!activeRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanLoop();
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { scanLoop(); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (workerRef.current && !scanningRef.current) {
        scanningRef.current = true;
        workerRef.current.onmessage = (e) => {
          scanningRef.current = false;
          if (e.data) {
            activeRef.current = false;
            streamRef.current?.getTracks().forEach(t => t.stop());
            onDetected(e.data);
          } else {
            scanLoop();
          }
        };
        workerRef.current.postMessage({
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        });
      } else {
        scanLoop();
      }
    }, 250);
  }, [onDetected]);

  useEffect(() => {
    let mounted = true;
    activeRef.current = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          videoRef.current.addEventListener('loadedmetadata', scanLoop);
        }
      } catch {
        if (mounted) setCameraError('Não foi possível acessar a câmera.');
      }
    })();
    return () => {
      mounted = false;
      activeRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [scanLoop]);

  if (cameraError) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-3xl mb-2">📷</p>
        <p className="text-xs text-red-500 font-medium">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      {/* Scan frame overlay */}
      <div className="absolute inset-4">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-orange-500 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-orange-500 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-orange-500 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-orange-500 rounded-br-lg" />
      </div>
      <div className="absolute left-4 right-4 h-0.5 bg-orange-500/60 animate-scan" />
    </div>
  );
}

/* ─── Painel de registro de itens do cliente ─── */
function CustomerItemPanel({
  customer,
  vendorId,
  supabase,
  onClose,
}: {
  customer: { id: string; name: string; email: string };
  vendorId: string;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
}) {
  const [menuItems, setMenuItems] = useState<{ id: string; name: string; price: number; category: string }[]>([]);
  const [cart, setCart] = useState<{ item_id: string; name: string; quantity: number; unit_price: number; weight_kg?: number }[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Carregar cardápio do vendor
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('id, name, price, category')
        .eq('vendor_id', vendorId)
        .eq('available', true)
        .order('category')
        .order('name');
      if (data) setMenuItems(data);
    })();
  }, [supabase, vendorId]);

  const addToCart = useCallback((item: { id: string; name: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item_id: item.id, name: item.name, quantity: 1, unit_price: item.price }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.item_id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.item_id !== itemId);
    });
  }, []);

  const addWeightItem = useCallback(() => {
    const weight = parseFloat(weightInput.replace(',', '.'));
    const price = parseFloat(pricePerKg.replace(',', '.'));
    if (!weight || weight <= 0 || !price || price <= 0) return;
    const total = weight * price;
    setCart(prev => [...prev, {
      item_id: `weight-${Date.now()}`,
      name: `Prato por quilo (${weight.toFixed(3)}kg × R$${price.toFixed(2)})`,
      quantity: 1,
      unit_price: Math.round(total * 100) / 100,
      weight_kg: weight,
    }]);
    setWeightInput('');
    setPricePerKg('');
  }, [weightInput, pricePerKg]);

  const total = useMemo(() => cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0), [cart]);

  const submitOrder = useCallback(async () => {
    if (cart.length === 0) return;
    setSending(true);
    setError('');

    // Gerar pickup code
    const pickupCode = String(Math.floor(100 + Math.random() * 900));

    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      vendor_id: vendorId,
      customer_id: customer.id,
      status: 'confirmed',
      total_price: total,
      pickup_code: pickupCode,
      payment_method: 'pending',
    }).select().single();

    if (orderErr || !order) {
      setError(orderErr?.message || 'Erro ao criar pedido.');
      setSending(false);
      return;
    }

    // Inserir itens (apenas os do cardápio, itens por peso vão como observação)
    const orderItems = cart.map(c => ({
      order_id: order.id,
      menu_item_id: c.item_id.startsWith('weight-') ? null : c.item_id,
      quantity: c.quantity,
      unit_price: c.unit_price,
      notes: c.weight_kg ? c.name : null,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) {
      setError('Pedido criado, mas erro ao salvar itens: ' + itemsErr.message);
      setSending(false);
      return;
    }

    setSending(false);
    setSuccess(true);
  }, [cart, total, supabase, vendorId, customer.id]);

  if (success) {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Pedido registrado!</h3>
        <p className="text-sm text-gray-500">
          {cart.length} {cart.length === 1 ? 'item' : 'itens'} na conta de <strong>{customer.name}</strong>
        </p>
        <p className="text-lg font-black text-green-600">R$ {total.toFixed(2)}</p>
        <button
          onClick={onClose}
          className="mt-4 bg-orange-500 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange-600 transition"
        >
          Escanear outro cliente
        </button>
      </div>
    );
  }

  // Agrupar itens do cardápio por categoria
  const grouped = useMemo(() => {
    const map = new Map<string, typeof menuItems>();
    for (const item of menuItems) {
      const cat = item.category || 'Outros';
      const group = map.get(cat) || [];
      group.push(item);
      map.set(cat, group);
    }
    return map;
  }, [menuItems]);

  return (
    <div className="space-y-4">
      {/* Header do cliente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black text-sm">
            {customer.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{customer.name}</p>
            <p className="text-[10px] text-gray-400">{customer.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Seção: Prato por quilo */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 space-y-3">
        <h4 className="text-xs font-black text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 01-6.001 0M18 7l-3 9m-3-9l-3-9m3 9V4" /></svg>
          Prato por quilo
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-amber-600 block mb-1">Peso (kg)</label>
            <input
              type="text"
              inputMode="decimal"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="Ex: 0.350"
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-amber-600 block mb-1">R$/kg</label>
            <input
              type="text"
              inputMode="decimal"
              value={pricePerKg}
              onChange={e => setPricePerKg(e.target.value)}
              placeholder="Ex: 69.90"
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            />
          </div>
        </div>
        {weightInput && pricePerKg && (
          <p className="text-xs font-bold text-amber-800 text-center">
            Total: R$ {(parseFloat(weightInput.replace(',', '.') || '0') * parseFloat(pricePerKg.replace(',', '.') || '0')).toFixed(2)}
          </p>
        )}
        <button
          onClick={addWeightItem}
          disabled={!weightInput || !pricePerKg}
          className="w-full bg-amber-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-amber-600 transition disabled:opacity-40"
        >
          Adicionar prato pesado
        </button>
      </div>

      {/* Seção: Itens do cardápio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 max-h-60 overflow-y-auto">
        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4" /> Cardápio
        </h4>
        {menuItems.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum item disponível</p>
        ) : (
          Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{cat}</p>
              <div className="space-y-1">
                {items.map(item => {
                  const inCart = cart.find(c => c.item_id === item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-1.5">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{item.name}</p>
                        <p className="text-[10px] text-gray-400">R$ {item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {inCart ? (
                          <>
                            <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 bg-gray-100 rounded-lg text-xs font-bold flex items-center justify-center text-gray-600">-</button>
                            <span className="text-xs font-black w-5 text-center">{inCart.quantity}</span>
                            <button onClick={() => addToCart(item)} className="w-6 h-6 bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center justify-center">+</button>
                          </>
                        ) : (
                          <button onClick={() => addToCart(item)} className="text-[10px] font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition">
                            + Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Carrinho / Resumo */}
      {cart.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm p-4 space-y-3">
          <h4 className="text-xs font-black text-orange-600 uppercase tracking-wide">
            Resumo ({cart.length} {cart.length === 1 ? 'item' : 'itens'})
          </h4>
          <div className="space-y-1.5">
            {cart.map(c => (
              <div key={c.item_id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{c.quantity}x {c.name}</span>
                <span className="font-bold text-gray-900">R$ {(c.unit_price * c.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-orange-100 pt-2 flex items-center justify-between">
            <span className="text-sm font-black text-gray-900">Total</span>
            <span className="text-lg font-black text-orange-600">R$ {total.toFixed(2)}</span>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <button
            onClick={submitOrder}
            disabled={sending}
            className="w-full bg-orange-500 text-white font-bold text-sm py-3 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? 'Registrando...' : (
              <>
                <CheckCircle className="w-4 h-4" />
                Registrar na conta do cliente
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Input customizado para mensagem livre ─── */
function MessageCustomInput({ onSend, sending }: { onSend: (msg: string) => void; sending: boolean }) {
  const [text, setText] = useState('');
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onSend(text.trim()); setText(''); } }}
        placeholder="Ou escreva sua mensagem..."
        className="flex-1 h-10 bg-gray-50 border border-gray-100 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-gray-300"
        disabled={sending}
      />
      <button
        onClick={() => { if (text.trim()) { onSend(text.trim()); setText(''); } }}
        disabled={!text.trim() || sending}
        className="h-10 w-10 bg-blue-500 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition disabled:opacity-40"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
