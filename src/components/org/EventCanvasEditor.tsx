'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────
export type CanvasLayout = {
  id: string;
  name: string;
  canvas_data: any;
};

export type CanvasBooth = {
  id: string;
  label: string;
  element_type: string;
  fee_amount: number;
  vendor_id: string | null;
  status: string;
};

export type AvailableVendor = {
  id: string;
  name: string;
  email: string;
};

type PaletteItem = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  width: number;
  height: number;
  shape: 'rect' | 'circle';
  isBoothType: boolean; // tracked in list?
};

const PALETTE: PaletteItem[] = [
  { id: 'kiosk',     label: 'Kiosk',           emoji: '🟧', color: '#f97316', width: 80,  height: 60,  shape: 'rect',   isBoothType: true  },
  { id: 'booth',     label: 'Barraca',          emoji: '⛺', color: '#8b5cf6', width: 80,  height: 60,  shape: 'rect',   isBoothType: true  },
  { id: 'foodtruck', label: 'Food Truck',       emoji: '🚚', color: '#0ea5e9', width: 100, height: 60,  shape: 'rect',   isBoothType: true  },
  { id: 'bar',       label: 'Bar',              emoji: '🍺', color: '#ca8a04', width: 80,  height: 60,  shape: 'rect',   isBoothType: true  },
  { id: 'wc_m',      label: 'Banheiro M',       emoji: '🚹', color: '#3b82f6', width: 50,  height: 50,  shape: 'rect',   isBoothType: false },
  { id: 'wc_f',      label: 'Banheiro F',       emoji: '🚺', color: '#ec4899', width: 50,  height: 50,  shape: 'rect',   isBoothType: false },
  { id: 'stage',     label: 'Palco',            emoji: '🎭', color: '#f59e0b', width: 160, height: 90,  shape: 'rect',   isBoothType: false },
  { id: 'support',   label: 'Ponto de Apoio',   emoji: '➕', color: '#ef4444', width: 60,  height: 60,  shape: 'rect',   isBoothType: false },
  { id: 'parking',   label: 'Estacionamento',   emoji: '🅿️', color: '#6b7280', width: 90,  height: 70,  shape: 'rect',   isBoothType: false },
  { id: 'entrance',  label: 'Entrada',          emoji: '🟢', color: '#22c55e', width: 70,  height: 40,  shape: 'rect',   isBoothType: false },
  { id: 'exit',      label: 'Saída',            emoji: '🔴', color: '#ef4444', width: 70,  height: 40,  shape: 'rect',   isBoothType: false },
  { id: 'trash',     label: 'Lixo',             emoji: '🗑️', color: '#78716c', width: 40,  height: 40,  shape: 'circle', isBoothType: false },
  { id: 'security',  label: 'Segurança',        emoji: '👮', color: '#1d4ed8', width: 50,  height: 50,  shape: 'circle', isBoothType: false },
  { id: 'atm',       label: 'Caixa Eletrônico', emoji: '🏧', color: '#0f766e', width: 50,  height: 60,  shape: 'rect',   isBoothType: false },
];

const PALETTE_BY_ID = Object.fromEntries(PALETTE.map(p => [p.id, p]));

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponível',
  invited:   'Convidado',
  confirmed: 'Confirmado',
  paid:      'Pago',
};

const STATUS_COLOR: Record<string, string> = {
  available: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  invited:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  paid:      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
  eventId: string;
  initialLayouts: CanvasLayout[];
  availableVendors: AvailableVendor[];
}

// ── Component ──────────────────────────────────────────────────────────────
export default function EventCanvasEditor({ eventId, initialLayouts, availableVendors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const switchingRef = useRef(false); // prevents object:removed from deleting during layout switch

  const [layouts, setLayouts] = useState<CanvasLayout[]>(initialLayouts);
  const [activeId, setActiveId] = useState<string | null>(initialLayouts[0]?.id ?? null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Canvas booths (tracked elements)
  const [canvasBooths, setCanvasBooths] = useState<CanvasBooth[]>([]);
  const [boothEdits, setBoothEdits] = useState<Record<string, { label: string; fee: string }>>({});
  const savingBoothRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Invite modal
  const [inviteBoothId, setInviteBoothId] = useState<string | null>(null);
  const [inviteVendorId, setInviteVendorId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Toolbar
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0.4);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'arrow' | 'rect'>('select');
  const [selectedObj, setSelectedObj] = useState(false);

  const arrowStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawingArrowRef = useRef<any>(null);
  const supabase = createClient();

  // ── Load Fabric ──
  useEffect(() => {
    import('fabric').then((mod) => {
      (window as any).__fabric = mod.fabric ?? mod.default ?? mod;
      setFabricLoaded(true);
    });
  }, []);

  // ── Load booths for a layout ──
  const loadBooths = useCallback(async (layoutId: string) => {
    const { data } = await supabase
      .from('event_canvas_booths')
      .select('id, label, element_type, fee_amount, vendor_id, status')
      .eq('canvas_layout_id', layoutId)
      .order('created_at');
    const booths = data ?? [];
    setCanvasBooths(booths);
    setBoothEdits(Object.fromEntries(booths.map(b => [b.id, { label: b.label, fee: String(b.fee_amount) }])));
  }, [supabase]);

  // ── Init canvas ──
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current) return;
    const fabric = (window as any).__fabric;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8fafc',
      selection: true,
    });
    fabricRef.current = canvas;

    // Load first layout
    const first = layouts.find(l => l.id === activeId);
    if (first?.canvas_data) {
      canvas.loadFromJSON(first.canvas_data, () => {
        canvas.renderAll();
        const bg = canvas.backgroundImage;
        if (bg) { bg.set('opacity', bgOpacity); canvas.renderAll(); setBgImage('loaded'); }
      });
    }
    if (activeId) loadBooths(activeId);

    canvas.on('selection:created', () => setSelectedObj(true));
    canvas.on('selection:updated', () => setSelectedObj(true));
    canvas.on('selection:cleared', () => setSelectedObj(false));

    // Delete booth from DB when element is removed from canvas
    canvas.on('object:removed', (opt: any) => {
      if (switchingRef.current) return;
      const boothId = opt.target?.data?.boothId;
      if (boothId) {
        supabase.from('event_canvas_booths').delete().eq('id', boothId).then(() => {});
        setCanvasBooths(prev => prev.filter(b => b.id !== boothId));
        setBoothEdits(prev => { const n = { ...prev }; delete n[boothId]; return n; });
      }
    });

    return () => { canvas.dispose(); fabricRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricLoaded]);

  // ── Switch layout ──
  const switchLayout = useCallback(async (id: string) => {
    const canvas = fabricRef.current;
    if (!canvas || id === activeId) return;

    // Save current canvas in memory
    const currentJson = canvas.toJSON(['data']);
    setLayouts(prev => prev.map(l => l.id === activeId ? { ...l, canvas_data: currentJson } : l));

    // Load new
    switchingRef.current = true;
    canvas.clear();
    canvas.backgroundColor = '#f8fafc';
    setBgImage(null);

    const target = layouts.find(l => l.id === id);
    if (target?.canvas_data) {
      canvas.loadFromJSON(target.canvas_data, () => {
        canvas.renderAll();
        const bg = canvas.backgroundImage;
        if (bg) { bg.set('opacity', bgOpacity); canvas.renderAll(); setBgImage('loaded'); }
        switchingRef.current = false;
      });
    } else {
      canvas.renderAll();
      switchingRef.current = false;
    }

    setActiveId(id);
    setActiveTool('select');
    setSelectedObj(false);
    await loadBooths(id);
  }, [activeId, bgOpacity, layouts, loadBooths]);

  // ── Create layout ──
  const createLayout = useCallback(async () => {
    const name = `Layout ${layouts.length + 1}`;
    const { data, error } = await supabase
      .from('event_canvas_layouts')
      .insert({ event_id: eventId, name, canvas_data: null })
      .select('id, name, canvas_data')
      .single();
    if (error || !data) return;
    setLayouts(prev => [...prev, data]);
    switchLayout(data.id);
  }, [eventId, layouts.length, supabase, switchLayout]);

  // ── Delete layout ──
  const deleteLayout = useCallback(async (id: string) => {
    if (layouts.length <= 1) return;
    if (!confirm('Excluir este layout e todas as barracas nele?')) return;
    await supabase.from('event_canvas_layouts').delete().eq('id', id);
    const remaining = layouts.filter(l => l.id !== id);
    setLayouts(remaining);
    if (activeId === id) switchLayout(remaining[0].id);
  }, [layouts, activeId, supabase, switchLayout]);

  // ── Rename layout ──
  const startRename = useCallback((id: string, name: string) => { setEditingNameId(id); setEditingNameValue(name); }, []);
  const commitRename = useCallback(async () => {
    if (!editingNameId) return;
    const trimmed = editingNameValue.trim() || 'Layout';
    await supabase.from('event_canvas_layouts').update({ name: trimmed }).eq('id', editingNameId);
    setLayouts(prev => prev.map(l => l.id === editingNameId ? { ...l, name: trimmed } : l));
    setEditingNameId(null);
  }, [editingNameId, editingNameValue, supabase]);

  // ── Save canvas ──
  const save = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || !activeId) return;
    setSaving(true);
    const json = canvas.toJSON(['data']);
    await supabase.from('event_canvas_layouts').update({ canvas_data: json }).eq('id', activeId);
    setLayouts(prev => prev.map(l => l.id === activeId ? { ...l, canvas_data: json } : l));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [activeId, supabase]);

  // ── Add palette item ──
  const addPaletteItem = useCallback(async (item: PaletteItem) => {
    const fabric = (window as any).__fabric;
    const canvas = fabricRef.current;
    if (!fabric || !canvas || !activeId) return;

    const cx = canvas.width / 2 + (Math.random() - 0.5) * 100;
    const cy = canvas.height / 2 + (Math.random() - 0.5) * 100;

    // Create DB record first if it's a booth type
    let boothId: string | undefined;
    if (item.isBoothType) {
      const boothNum = canvasBooths.filter(b => b.element_type === item.id).length + 1;
      const label = `${item.label} ${boothNum}`;
      const { data } = await supabase
        .from('event_canvas_booths')
        .insert({ event_id: eventId, canvas_layout_id: activeId, label, element_type: item.id, fee_amount: 0 })
        .select('id, label, element_type, fee_amount, vendor_id, status')
        .single();
      if (data) {
        boothId = data.id;
        setCanvasBooths(prev => [...prev, data]);
        setBoothEdits(prev => ({ ...prev, [data.id]: { label: data.label, fee: '0' } }));
      }
    }

    const baseProps = { left: 0, top: 0, fill: item.color + '33', stroke: item.color, strokeWidth: 2 };
    const shape = item.shape === 'circle'
      ? new fabric.Ellipse({ ...baseProps, width: item.width, height: item.height, rx: item.width / 2, ry: item.height / 2 })
      : new fabric.Rect({ ...baseProps, width: item.width, height: item.height, rx: 8, ry: 8 });

    const labelText = boothId
      ? canvasBooths.filter(b => b.element_type === item.id).length + 1 > 1
        ? `${item.emoji} ${item.label} ${canvasBooths.filter(b => b.element_type === item.id).length + 1}`
        : `${item.emoji} ${item.label} 1`
      : `${item.emoji} ${item.label}`;

    const label = new fabric.Text(labelText, {
      fontSize: 11, fill: item.color, fontFamily: 'Inter, sans-serif', fontWeight: 'bold',
      originX: 'center', originY: 'center', left: item.width / 2, top: item.height / 2, textAlign: 'center',
    });

    const group = new fabric.Group([shape, label], {
      left: cx - item.width / 2, top: cy - item.height / 2,
      data: { type: item.id, label: item.label, boothId },
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [activeId, canvasBooths, eventId, supabase]);

  // ── Booth label/fee editing (debounced save) ──
  const updateBoothField = useCallback((boothId: string, field: 'label' | 'fee', value: string) => {
    setBoothEdits(prev => ({ ...prev, [boothId]: { ...prev[boothId], [field]: value } }));
    if (savingBoothRef.current[boothId]) clearTimeout(savingBoothRef.current[boothId]);
    savingBoothRef.current[boothId] = setTimeout(async () => {
      const patch = field === 'label'
        ? { label: value.trim() || 'Kiosk' }
        : { fee_amount: parseFloat(value) || 0 };
      await supabase.from('event_canvas_booths').update(patch).eq('id', boothId);
      setCanvasBooths(prev => prev.map(b => b.id === boothId ? { ...b, ...patch } : b));
    }, 600);
  }, [supabase]);

  // ── Send invite from canvas ──
  const sendInvite = useCallback(async () => {
    if (!inviteBoothId) return;
    const booth = canvasBooths.find(b => b.id === inviteBoothId);
    if (!booth) return;

    const vendor = availableVendors.find(v => v.id === inviteVendorId);
    const email = vendor?.email || inviteEmail.trim();
    if (!inviteVendorId && !email) { setInviteError('Selecione um vendor ou informe o e-mail.'); return; }

    setInviteSending(true);
    setInviteError('');

    const { error } = await supabase.from('event_vendor_invitations').insert({
      event_id: eventId,
      vendor_id: inviteVendorId || null,
      vendor_email: email,
      fee_amount: booth.fee_amount,
      status: 'pending',
      canvas_booth_id: inviteBoothId,
    });

    if (error) { setInviteError(error.message); setInviteSending(false); return; }

    // Update booth status
    await supabase.from('event_canvas_booths').update({ status: 'invited', vendor_id: inviteVendorId || null }).eq('id', inviteBoothId);
    setCanvasBooths(prev => prev.map(b => b.id === inviteBoothId ? { ...b, status: 'invited', vendor_id: inviteVendorId || null } : b));

    setInviteSending(false);
    setInviteBoothId(null);
    setInviteVendorId('');
    setInviteEmail('');
  }, [inviteBoothId, inviteVendorId, inviteEmail, canvasBooths, availableVendors, eventId, supabase]);

  // ── Tool wiring ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';
    canvas.off('mouse:down'); canvas.off('mouse:move'); canvas.off('mouse:up');

    if (activeTool === 'text') {
      canvas.on('mouse:down', (opt: any) => {
        if (opt.target) return;
        const fabric = (window as any).__fabric;
        const p = canvas.getPointer(opt.e);
        const text = new fabric.IText('Texto', {
          left: p.x, top: p.y, fontSize: 16, fill: '#1e293b', fontFamily: 'Inter, sans-serif', editable: true,
        });
        canvas.add(text); canvas.setActiveObject(text); text.enterEditing(); text.selectAll();
        setActiveTool('select');
      });
    }

    if (activeTool === 'arrow') {
      canvas.on('mouse:down', (opt: any) => {
        const p = canvas.getPointer(opt.e);
        arrowStartRef.current = { x: p.x, y: p.y };
        const fabric = (window as any).__fabric;
        const line = new fabric.Line([p.x, p.y, p.x, p.y], { stroke: '#1e293b', strokeWidth: 2, selectable: false });
        drawingArrowRef.current = line; canvas.add(line);
      });
      canvas.on('mouse:move', (opt: any) => {
        if (!arrowStartRef.current || !drawingArrowRef.current) return;
        const p = canvas.getPointer(opt.e);
        drawingArrowRef.current.set({ x2: p.x, y2: p.y }); canvas.renderAll();
      });
      canvas.on('mouse:up', (opt: any) => {
        if (!arrowStartRef.current || !drawingArrowRef.current) return;
        const fabric = (window as any).__fabric;
        const p = canvas.getPointer(opt.e);
        const s = arrowStartRef.current;
        canvas.remove(drawingArrowRef.current);
        const dx = p.x - s.x, dy = p.y - s.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 10) { arrowStartRef.current = null; drawingArrowRef.current = null; return; }
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const line = new fabric.Line([0, 0, len, 0], { stroke: '#1e293b', strokeWidth: 2, originX: 'left', originY: 'center' });
        const head = new fabric.Triangle({ width: 12, height: 14, fill: '#1e293b', left: len - 6, top: 0, originX: 'center', originY: 'center', angle: 90 });
        canvas.add(new fabric.Group([line, head], { left: s.x, top: s.y, angle, originX: 'left', originY: 'center' }));
        arrowStartRef.current = null; drawingArrowRef.current = null;
        setActiveTool('select');
      });
    }

    if (activeTool === 'rect') {
      let sp: { x: number; y: number } | null = null, dr: any = null;
      canvas.on('mouse:down', (opt: any) => {
        const p = canvas.getPointer(opt.e); sp = { x: p.x, y: p.y };
        const fabric = (window as any).__fabric;
        dr = new fabric.Rect({ left: p.x, top: p.y, width: 0, height: 0, fill: 'rgba(100,116,139,0.15)', stroke: '#64748b', strokeWidth: 1.5, selectable: false });
        canvas.add(dr);
      });
      canvas.on('mouse:move', (opt: any) => {
        if (!sp || !dr) return;
        const p = canvas.getPointer(opt.e), w = p.x - sp.x, h = p.y - sp.y;
        dr.set({ left: w < 0 ? p.x : sp.x, top: h < 0 ? p.y : sp.y, width: Math.abs(w), height: Math.abs(h) });
        canvas.renderAll();
      });
      canvas.on('mouse:up', () => {
        if (dr) { dr.set({ selectable: true }); canvas.setActiveObject(dr); }
        sp = null; dr = null; setActiveTool('select');
      });
    }
  }, [activeTool]);

  // ── Background image ──
  const handleBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fabric = (window as any).__fabric;
    const canvas = fabricRef.current;
    if (!fabric || !canvas) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      fabric.Image.fromURL(url, (img: any) => {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        img.set({ scaleX: scale, scaleY: scale, opacity: bgOpacity, selectable: false, evented: false });
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        setBgImage(url);
      });
    };
    reader.readAsDataURL(file);
  }, [bgOpacity]);

  const handleOpacityChange = useCallback((val: number) => {
    setBgOpacity(val);
    const canvas = fabricRef.current;
    if (!canvas) return;
    const bg = canvas.backgroundImage;
    if (bg) { bg.set('opacity', val); canvas.renderAll(); }
  }, []);

  // ── Delete selected ──
  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj: any) => canvas.remove(obj));
    canvas.discardActiveObject(); canvas.renderAll();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') deleteSelected();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected]);

  const activeLayout = layouts.find(l => l.id === activeId);
  const inviteBooth = canvasBooths.find(b => b.id === inviteBoothId);

  return (
    <div className="flex flex-col gap-3">

      {/* ── Layout tabs ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {layouts.map(l => (
          <div
            key={l.id}
            onClick={() => switchLayout(l.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer select-none ${
              l.id === activeId
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {editingNameId === l.id ? (
              <input
                autoFocus
                value={editingNameValue}
                onChange={e => setEditingNameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingNameId(null); }}
                className="bg-transparent outline-none w-24 text-xs"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span onDoubleClick={e => { e.stopPropagation(); startRename(l.id, l.name); }}>{l.name}</span>
            )}
            {layouts.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); deleteLayout(l.id); }}
                className={`ml-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] leading-none ${
                  l.id === activeId ? 'hover:bg-purple-500' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >×</button>
            )}
          </div>
        ))}
        <button
          onClick={createLayout}
          className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          + Novo
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3">
        <div className="flex gap-1 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
          {([
            { key: 'select', label: 'Selecionar', icon: '↖' },
            { key: 'text',   label: 'Texto',      icon: 'T' },
            { key: 'arrow',  label: 'Seta',        icon: '→' },
            { key: 'rect',   label: 'Área',        icon: '▭' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTool(t.key)} title={t.label}
              className={`w-8 h-8 rounded-lg text-sm font-bold transition ${activeTool === t.key ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {t.icon}
            </button>
          ))}
        </div>

        {selectedObj && (
          <button onClick={deleteSelected} className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition">
            🗑 Deletar
          </button>
        )}

        <label className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition">
          🖼 Fundo
          <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        </label>

        {bgImage && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Opacidade</span>
            <input type="range" min={0} max={1} step={0.05} value={bgOpacity}
              onChange={e => handleOpacityChange(Number(e.target.value))}
              className="w-24 h-1 accent-purple-600" />
            <span className="text-xs text-slate-400 w-8">{Math.round(bgOpacity * 100)}%</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {activeLayout && <span className="text-xs text-slate-400 hidden sm:block">{activeLayout.name}</span>}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 px-4 h-8 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 transition">
            {saving ? 'Salvando…' : saved ? '✓ Salvo' : '💾 Salvar'}
          </button>
        </div>
      </div>

      {/* ── Canvas + Palette ── */}
      <div className="flex gap-3">
        {/* Palette */}
        <div className="w-36 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 max-h-[620px] overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-1 mb-1">Elementos</p>
          {PALETTE.map(item => (
            <button key={item.id} onClick={() => addPaletteItem(item)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left w-full">
              <span className="text-base leading-none">{item.emoji}</span>
              <span className="truncate">{item.label}</span>
              {item.isBoothType && <span className="ml-auto text-[9px] text-purple-500 font-bold">LISTA</span>}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950" style={{ minHeight: 620 }}>
          {!fabricLoaded && <div className="flex items-center justify-center h-full text-slate-400 text-sm">Carregando editor…</div>}
          <canvas ref={canvasRef} className={fabricLoaded ? 'block' : 'hidden'} />
        </div>
      </div>

      {/* ── Booth List ── */}
      {canvasBooths.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Barracas / Kiosks — {activeLayout?.name}
            </h3>
            <span className="text-xs text-slate-400">{canvasBooths.length} espaço{canvasBooths.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {canvasBooths.map(booth => {
              const p = PALETTE_BY_ID[booth.element_type];
              const edit = boothEdits[booth.id] ?? { label: booth.label, fee: String(booth.fee_amount) };
              const isInviting = inviteBoothId === booth.id;

              return (
                <div key={booth.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Emoji + type */}
                    <span className="text-xl leading-none w-8 text-center">{p?.emoji ?? '📦'}</span>

                    {/* Name */}
                    <input
                      value={edit.label}
                      onChange={e => updateBoothField(booth.id, 'label', e.target.value)}
                      placeholder="Nome da barraca"
                      className="flex-1 min-w-[120px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />

                    {/* Fee */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">R$</span>
                      <input
                        type="number" min={0} step={10}
                        value={edit.fee}
                        onChange={e => updateBoothField(booth.id, 'fee', e.target.value)}
                        placeholder="0"
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition"
                      />
                    </div>

                    {/* Status badge */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[booth.status] ?? STATUS_COLOR.available}`}>
                      {STATUS_LABEL[booth.status] ?? booth.status}
                    </span>

                    {/* Vendor name if assigned */}
                    {booth.vendor_id && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {availableVendors.find(v => v.id === booth.vendor_id)?.name ?? 'Vendor'}
                      </span>
                    )}

                    {/* Invite button */}
                    {booth.status === 'available' && (
                      <button
                        onClick={() => { setInviteBoothId(isInviting ? null : booth.id); setInviteError(''); setInviteVendorId(''); setInviteEmail(''); }}
                        className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition"
                      >
                        {isInviting ? 'Cancelar' : '✉ Convidar'}
                      </button>
                    )}
                  </div>

                  {/* Invite form */}
                  {isInviting && (
                    <div className="ml-11 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Convidar para <strong>{edit.label}</strong> — R$ {parseFloat(edit.fee || '0').toFixed(2)}
                      </p>

                      {availableVendors.length > 0 && (
                        <select
                          value={inviteVendorId}
                          onChange={e => { setInviteVendorId(e.target.value); if (e.target.value) setInviteEmail(availableVendors.find(v => v.id === e.target.value)?.email ?? ''); }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">— Selecionar vendor cadastrado —</option>
                          {availableVendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.email})</option>
                          ))}
                        </select>
                      )}

                      {!inviteVendorId && (
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          placeholder="Ou informe o e-mail manualmente"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      )}

                      {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}

                      <button
                        onClick={sendInvite}
                        disabled={inviteSending}
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 transition"
                      >
                        {inviteSending ? 'Enviando…' : 'Enviar Convite'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-600 text-center">
        Elementos marcados com LISTA aparecem abaixo para gerenciamento · Duplo clique no nome da aba para renomear · Del remove selecionado
      </p>
    </div>
  );
}
