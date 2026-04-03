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
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<any>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const switchingRef = useRef(false);
  const addPaletteItemRef = useRef<(item: PaletteItem, x?: number, y?: number) => Promise<void>>(async () => {});

  // Custom drag-from-palette
  const [draggingItem, setDraggingItem] = useState<PaletteItem | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const draggingItemRef = useRef<PaletteItem | null>(null);

  // Color + zoom
  const [strokeColor, setStrokeColor] = useState('#1e293b');
  const strokeColorRef = useRef('#1e293b');
  const [zoom, setZoom] = useState(100);

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
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const clipboardRef = useRef<any>(null);

  // Inline label editing (dblclick on canvas group)
  const [editingLabel, setEditingLabel] = useState<{
    obj: any;
    firstLine: string;
    customName: string;
    boothId?: string;
    screen: { left: number; top: number; width: number };
  } | null>(null);

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

  // ── Auto-create initial layout if none exist ──
  useEffect(() => {
    if (!fabricLoaded || layouts.length > 0) return;
    supabase
      .from('event_canvas_layouts')
      .insert({ event_id: eventId, name: 'Layout 1', canvas_data: null })
      .select('id, name, canvas_data')
      .single()
      .then(({ data }) => {
        if (!data) return;
        setLayouts([data]);
        setActiveId(data.id);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricLoaded]);

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

    // Override rotation handle globally → orange circle for all objects
    if (fabric.Object.prototype.controls?.mtr) {
      fabric.Object.prototype.controls.mtr.sizeX = 18;
      fabric.Object.prototype.controls.mtr.sizeY = 18;
      fabric.Object.prototype.controls.mtr.render = function(ctx: any, left: number, top: number) {
        ctx.save();
        ctx.fillStyle = '#f97316';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(left, top, 9, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
    }

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
        const bgObj = canvas.getObjects().find((o: any) => o.data?.isBg);
        if (bgObj) { bgObj.set({ selectable: false, evented: false, opacity: bgOpacity }); setBgImage('loaded'); }
        const bg = canvas.backgroundImage;
        if (bg) { bg.set('opacity', bgOpacity); setBgImage('loaded'); }
        canvas.renderAll();
      });
    }
    if (activeId) loadBooths(activeId);

    const syncSelectedColor = () => {
      const obj = canvas.getActiveObject();
      if (!obj) { setSelectedColor(null); return; }
      const color = obj.stroke || obj.fill || obj.get?.('fill') || null;
      setSelectedColor(typeof color === 'string' && color !== 'transparent' ? color : null);
    };
    canvas.on('selection:created', () => { setSelectedObj(true); syncSelectedColor(); });
    canvas.on('selection:updated', () => { setSelectedObj(true); syncSelectedColor(); });
    canvas.on('selection:cleared', () => { setSelectedObj(false); setSelectedColor(null); });

    // Delete booth from DB when element is removed from canvas
    canvas.on('object:removed', (opt: any) => {
      if (switchingRef.current) return;
      const boothId = opt.target?.data?.boothId;
      if (boothId) {
        supabase.from('event_canvas_booths').delete().eq('id', boothId).then(() => {});
        setCanvasBooths(prev => prev.filter(b => b.id !== boothId));
        setBoothEdits(prev => { const n = { ...prev }; delete n[boothId]; return n; });
      }
      if (opt.target?.data?.isBg) {
        setBgImage(null);
      }
    });

    // Keep background image always at the back after any modification
    canvas.on('object:modified', (opt: any) => {
      if (opt.target?.data?.isBg) canvas.sendToBack(opt.target);
    });

    // Mouse-wheel zoom
    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let z = canvas.getZoom();
      z *= 0.999 ** delta;
      z = Math.min(Math.max(z, 0.1), 8);
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, z);
      setZoom(Math.round(z * 100));
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Double-click: listen on document capture phase so Fabric's stopPropagation doesn't block it
    const onDblClick = (e: MouseEvent) => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper || !wrapper.contains(e.target as Node)) return;
      const fc = fabricRef.current;
      if (!fc) return;
      let obj = fc.getActiveObject() as any;
      if (obj && !obj.data?.type && obj.group?.data?.type) obj = obj.group;
      if (!obj || obj.type !== 'group' || !obj.data?.type) return;
      const textChild = obj.getObjects().find((o: any) => o.type === 'text');
      if (!textChild) return;
      const br = obj.getBoundingRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const overlayW = Math.max(br.width, 160);
      const rawLeft = wrapperRect.left + br.left;
      const rawTop  = wrapperRect.top  + br.top + br.height + 4;
      const left = Math.min(rawLeft, window.innerWidth  - overlayW - 8);
      const top  = Math.min(Math.max(rawTop, 8), window.innerHeight - 120);
      setEditingLabel({
        obj,
        firstLine: obj.data?.label ?? '',
        customName: textChild.text ?? '',
        boothId: obj.data?.boothId,
        screen: { left, top, width: overlayW },
      });
    };
    document.addEventListener('dblclick', onDblClick, true);

    return () => { document.removeEventListener('dblclick', onDblClick, true); canvas.dispose(); fabricRef.current = null; };
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
        const bgObj = canvas.getObjects().find((o: any) => o.data?.isBg);
        if (bgObj) { bgObj.set({ selectable: false, evented: false, opacity: bgOpacity }); setBgImage('loaded'); }
        const bg = canvas.backgroundImage;
        if (bg) { bg.set('opacity', bgOpacity); setBgImage('loaded'); }
        canvas.renderAll();
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

  // ── Add palette item (dropX/Y = canvas-space coords; undefined = center) ──
  const addPaletteItem = useCallback(async (item: PaletteItem, dropX?: number, dropY?: number) => {
    const fabric = (window as any).__fabric;
    const canvas = fabricRef.current;
    if (!fabric || !canvas || !activeId) return;

    const cx = dropX ?? canvas.width / 2 + (Math.random() - 0.5) * 100;
    const cy = dropY ?? canvas.height / 2 + (Math.random() - 0.5) * 100;

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

    const boothNum = canvasBooths.filter(b => b.element_type === item.id).length + 1;
    const labelText = item.isBoothType
      ? `${item.emoji} ${item.label} ${boothNum}`
      : `${item.emoji} ${item.label}`;

    const baseProps = { left: 0, top: 0, fill: item.color + '33', stroke: item.color, strokeWidth: 2 };
    const shape = item.shape === 'circle'
      ? new fabric.Ellipse({ ...baseProps, width: item.width, height: item.height, rx: item.width / 2, ry: item.height / 2 })
      : new fabric.Rect({ ...baseProps, width: item.width, height: item.height, rx: 8, ry: 8 });

    const label = new fabric.Text(labelText, {
      fontSize: 11, fill: item.color, fontFamily: 'Inter, sans-serif', fontWeight: 'bold',
      originX: 'center', originY: 'center', left: item.width / 2, top: item.height / 2, textAlign: 'center',
    });

    const group = new fabric.Group([shape, label], {
      left: cx - item.width / 2, top: cy - item.height / 2,
      data: { type: item.id, label: item.label, boothId },
      hasControls: true,
      hasBorders: true,
    });
    // Move rotation handle to bottom-center; render as orange circle
    group.setControlsVisibility({ mtr: true });
    if (group.controls?.mtr) {
      group.controls.mtr.offsetY = 20;
      group.controls.mtr.y = 0.5;
      group.controls.mtr.sizeX = 18;
      group.controls.mtr.sizeY = 18;
      group.controls.mtr.render = function(ctx: any, left: number, top: number) {
        ctx.save();
        ctx.fillStyle = '#f97316';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(left, top, 9, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
    }

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();

    // Auto-save canvas JSON so elements persist even without clicking Salvar
    const json = canvas.toJSON(['data']);
    await supabase.from('event_canvas_layouts').update({ canvas_data: json }).eq('id', activeId);
    setLayouts(prev => prev.map(l => l.id === activeId ? { ...l, canvas_data: json } : l));
  }, [activeId, canvasBooths, eventId, supabase]);

  // Keep refs in sync
  useEffect(() => { addPaletteItemRef.current = addPaletteItem; }, [addPaletteItem]);
  useEffect(() => { strokeColorRef.current = strokeColor; }, [strokeColor]);

  // ── Custom palette drag (listeners added synchronously in mousedown — no useEffect delay) ──
  const startPaletteDrag = useCallback((e: React.MouseEvent, item: PaletteItem) => {
    e.preventDefault();
    draggingItemRef.current = item;
    setDraggingItem(item);

    const ghost = document.createElement('div');
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;padding:6px 12px;background:#7c3aed;color:white;border-radius:10px;font-size:12px;font-weight:bold;white-space:nowrap;opacity:0.92;transform:translate(-50%,-50%);left:${e.clientX}px;top:${e.clientY}px;box-shadow:0 4px 16px rgba(124,58,237,.4);`;
    ghost.textContent = `${item.emoji} ${item.label}`;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    const onMove = (ev: MouseEvent) => {
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top  = ev.clientY + 'px';
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (ghost.parentNode) document.body.removeChild(ghost);
      ghostRef.current = null;
      setDraggingItem(null);

      const currentItem = draggingItemRef.current;
      draggingItemRef.current = null;
      if (!currentItem) return;

      const fc = fabricRef.current;
      if (!fc) return;

      // Check if drop is over the Fabric canvas element
      const lowerCanvas = fc.lowerCanvasEl as HTMLElement;
      if (!lowerCanvas) return;
      const cr = lowerCanvas.getBoundingClientRect();
      if (ev.clientX < cr.left || ev.clientX > cr.right || ev.clientY < cr.top || ev.clientY > cr.bottom) return;

      // getPointer handles zoom + pan automatically
      const pointer = fc.getPointer(ev);
      addPaletteItemRef.current(currentItem, pointer.x, pointer.y);
    };

    // Attach immediately — no React render cycle needed
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // ── Delete booth from list (removes DB record + canvas element if present) ──
  const deleteBoothFromList = useCallback(async (boothId: string) => {
    if (!confirm('Remover esta barraca?')) return;
    // Remove canvas element if it exists
    const canvas = fabricRef.current;
    if (canvas) {
      const obj = canvas.getObjects().find((o: any) => o.data?.boothId === boothId);
      if (obj) {
        switchingRef.current = true; // prevent double-delete via object:removed
        canvas.remove(obj);
        switchingRef.current = false;
        canvas.renderAll();
        // Re-save canvas after removal
        const json = canvas.toJSON(['data']);
        await supabase.from('event_canvas_layouts').update({ canvas_data: json }).eq('id', activeId);
        setLayouts(prev => prev.map(l => l.id === activeId ? { ...l, canvas_data: json } : l));
      }
    }
    await supabase.from('event_canvas_booths').delete().eq('id', boothId);
    setCanvasBooths(prev => prev.filter(b => b.id !== boothId));
    setBoothEdits(prev => { const n = { ...prev }; delete n[boothId]; return n; });
  }, [activeId, supabase]);

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

    if (activeTool === 'select') {
      // Click+drag on empty area → pan; click on object → select normally
      let isPanning = false, lastX = 0, lastY = 0;
      canvas.on('mouse:down', (opt: any) => {
        if (opt.target) return; // hit an object — let Fabric handle selection
        isPanning = true;
        lastX = opt.e.clientX;
        lastY = opt.e.clientY;
        canvas.selection = false;
        canvas.setCursor('grabbing');
      });
      canvas.on('mouse:move', (opt: any) => {
        if (!isPanning) return;
        const vpt = canvas.viewportTransform as number[];
        vpt[4] += opt.e.clientX - lastX;
        vpt[5] += opt.e.clientY - lastY;
        canvas.requestRenderAll();
        lastX = opt.e.clientX;
        lastY = opt.e.clientY;
      });
      canvas.on('mouse:up', () => {
        if (!isPanning) return;
        isPanning = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
      });
    }

    if (activeTool === 'text') {
      canvas.on('mouse:down', (opt: any) => {
        if (opt.target) return;
        const fabric = (window as any).__fabric;
        const p = canvas.getPointer(opt.e);
        const text = new fabric.IText('Texto', {
          left: p.x, top: p.y, fontSize: 16, fill: strokeColorRef.current, fontFamily: 'Inter, sans-serif', editable: true,
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
        const line = new fabric.Line([p.x, p.y, p.x, p.y], { stroke: strokeColorRef.current, strokeWidth: 2, selectable: false });
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
        const col = strokeColorRef.current;
        const line = new fabric.Line([0, 0, len, 0], { stroke: col, strokeWidth: 2, originX: 'left', originY: 'center' });
        const head = new fabric.Triangle({ width: 12, height: 14, fill: col, left: len - 6, top: 0, originX: 'center', originY: 'center', angle: 90 });
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
        const col = strokeColorRef.current;
        dr = new fabric.Rect({ left: p.x, top: p.y, width: 0, height: 0, fill: col + '22', stroke: col, strokeWidth: 1.5, selectable: false });
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
  }, [activeTool, fabricLoaded]);

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
        // Remove existing background image object if any
        const existing = canvas.getObjects().find((o: any) => o.data?.isBg);
        if (existing) canvas.remove(existing);

        // Scale to fill canvas fully (cover), centered
        const scaleX = canvas.width  / img.width;
        const scaleY = canvas.height / img.height;
        const scale  = Math.max(scaleX, scaleY); // cover (no white space)
        const left   = (canvas.width  - img.width  * scale) / 2;
        const top    = (canvas.height - img.height * scale) / 2;

        img.set({
          left, top,
          scaleX: scale, scaleY: scale,
          opacity: bgOpacity,
          selectable: false,
          evented: false,
          data: { isBg: true },
        });

        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();
        setBgImage(url);
      });
    };
    reader.readAsDataURL(file);
  }, [bgOpacity]);

  const handleOpacityChange = useCallback((val: number) => {
    setBgOpacity(val);
    const canvas = fabricRef.current;
    if (!canvas) return;
    const bg = canvas.getObjects().find((o: any) => o.data?.isBg);
    if (bg) { bg.set('opacity', val); canvas.renderAll(); }
  }, []);

  // ── Delete selected ──
  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj: any) => canvas.remove(obj));
    canvas.discardActiveObject(); canvas.renderAll();
  }, []);

  // ── Copy / Paste ──
  const copySelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.clone((cloned: any) => { clipboardRef.current = cloned; }, ['data']);
  }, []);

  const pasteClipboard = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !clipboardRef.current) return;
    clipboardRef.current.clone((cloned: any) => {
      canvas.discardActiveObject();
      cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20, evented: true });
      // Clear boothId so the pasted element is independent from the original's DB record
      if (cloned.data) cloned.data = { ...cloned.data, boothId: undefined };
      if (cloned.type === 'activeSelection') {
        cloned.canvas = canvas;
        cloned.forEachObject((obj: any) => {
          if (obj.data) obj.data = { ...obj.data, boothId: undefined };
          canvas.add(obj);
        });
        cloned.setCoords();
      } else {
        // Generate copy name: "Kiosk 1" → "Kiosk 1(2)", "Kiosk 1(3)", etc.
        if (cloned.type === 'group' && cloned.data?.type) {
          const textChild = cloned.getObjects?.().find((o: any) => o.type === 'text');
          if (textChild) {
            const firstLine = (textChild.text ?? '').split('\n')[0] ?? '';
            // Strip leading emoji+space to get base label ("🟧 Kiosk 1" → "Kiosk 1")
            const baseName = firstLine.split(' ').slice(1).join(' ');
            const sameTypeCount = canvas.getObjects().filter((o: any) => o.data?.type === cloned.data?.type).length;
            const copyName = `${baseName}(${sameTypeCount + 1})`;
            textChild.set('text', `${firstLine}\n${copyName}`);
            cloned.dirty = true;
          }
        }
        canvas.add(cloned);
      }
      // Shift clipboard so each subsequent paste offsets further
      clipboardRef.current.left = (clipboardRef.current.left ?? 0) + 20;
      clipboardRef.current.top  = (clipboardRef.current.top  ?? 0) + 20;
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
    }, ['data']);
  }, []);

  const commitLabelEdit = useCallback(() => {
    setEditingLabel(prev => {
      if (!prev) return null;
      const { obj, firstLine, customName } = prev;
      const newCustom = customName.trim();
      const newText = newCustom || firstLine;
      const textChild = obj.getObjects?.().find((o: any) => o.type === 'text');
      if (textChild) {
        textChild.set('text', newText);
        obj.dirty = true;
        obj.setCoords();
        fabricRef.current?.requestRenderAll();
      }
      return null;
    });
  }, []);

  // Separate effect: when editingLabel closes, sync label to booth list
  const commitLabelEditWithSync = useCallback((current: typeof editingLabel) => {
    if (!current) return;
    const newCustom = current.customName.trim();
    if (current.boothId && newCustom) {
      updateBoothField(current.boothId, 'label', newCustom);
    }
  }, [updateBoothField]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteClipboard(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected, copySelected, pasteClipboard]);

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
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 sticky top-14 z-30 shadow-sm">
        {/* Tools */}
        <div className="flex gap-1 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
          {([
            { key: 'select', label: 'Selecionar', icon: '↖' },
            { key: 'text',   label: 'Texto',      icon: 'T' },
            { key: 'arrow',  label: 'Seta',       icon: '→' },
            { key: 'rect',   label: 'Área',       icon: '▭' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTool(t.key)} title={t.label}
              className={`w-8 h-8 rounded-lg text-sm font-bold transition ${activeTool === t.key ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Color picker (shown for drawing tools) */}
        {activeTool !== 'select' && (
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Cor</span>
            <input
              type="color" value={strokeColor}
              onChange={e => setStrokeColor(e.target.value)}
              title="Cor do elemento"
              className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
            />
          </div>
        )}

        {selectedObj && (
          <div className="flex items-center gap-1 flex-wrap">
            {/* Color picker for selected object */}
            {selectedColor !== null && (
              <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-2 mr-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Cor</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={e => {
                    const color = e.target.value;
                    setSelectedColor(color);
                    const canvas = fabricRef.current;
                    const obj = canvas?.getActiveObject();
                    if (!obj) return;
                    // Apply to all relevant properties depending on object type
                    const apply = (o: any) => {
                      if (o.type === 'group') { o.getObjects().forEach(apply); return; }
                      if (o.stroke && o.stroke !== 'transparent') o.set('stroke', color);
                      if (o.fill && o.fill !== 'transparent' && o.type !== 'rect') o.set('fill', color);
                      if (o.type === 'i-text' || o.type === 'text') o.set('fill', color);
                      if (o.type === 'rect') { o.set('stroke', color); o.set('fill', color + '22'); }
                    };
                    apply(obj);
                    canvas?.requestRenderAll();
                  }}
                  title="Cor do elemento"
                  className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
                />
              </div>
            )}
            {/* Rotate */}
            <button
              onClick={() => { const c = fabricRef.current; const o = c?.getActiveObject(); if (!o) return; o.rotate((o.angle ?? 0) - 45); c.requestRenderAll(); }}
              title="Girar −45°"
              className="w-8 h-8 rounded-lg text-base bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">↺</button>
            <button
              onClick={() => { const c = fabricRef.current; const o = c?.getActiveObject(); if (!o) return; o.rotate((o.angle ?? 0) + 45); c.requestRenderAll(); }}
              title="Girar +45°"
              className="w-8 h-8 rounded-lg text-base bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">↻</button>
            {/* Copy / Paste */}
            <button onClick={copySelected} title="Copiar (Ctrl+C)"
              className="w-8 h-8 rounded-lg text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">⎘</button>
            <button onClick={pasteClipboard} title="Colar (Ctrl+V)"
              className="w-8 h-8 rounded-lg text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">📋</button>
            {/* Delete */}
            <button onClick={deleteSelected} className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition">
              🗑 Deletar
            </button>
          </div>
        )}

        <label className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition">
          🖼 Fundo
          <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        </label>

        {bgImage && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Opac.</span>
            <input type="range" min={0} max={1} step={0.05} value={bgOpacity}
              onChange={e => handleOpacityChange(Number(e.target.value))}
              className="w-20 h-1 accent-purple-600" />
            <span className="text-xs text-slate-400 w-7">{Math.round(bgOpacity * 100)}%</span>
            <button
              onClick={() => {
                const canvas = fabricRef.current;
                if (!canvas) return;
                // Remove as regular object (new format)
                const bg = canvas.getObjects().find((o: any) => o.data?.isBg);
                if (bg) canvas.remove(bg);
                // Remove as canvas.backgroundImage (legacy format)
                if (canvas.backgroundImage) {
                  canvas.backgroundImage = null;
                }
                canvas.renderAll();
                setBgImage(null);
              }}
              title="Remover imagem de fundo"
              className="w-7 h-7 rounded-lg text-xs bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-100 flex items-center justify-center">✕</button>
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3 ml-1">
          <button
            onClick={() => { const c = fabricRef.current; if (!c) return; const z = Math.max(c.getZoom() * 0.8, 0.1); c.setZoom(z); setZoom(Math.round(z * 100)); }}
            className="w-7 h-7 rounded-lg text-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center leading-none">−</button>
          <button
            onClick={() => { const c = fabricRef.current; if (!c) return; c.setZoom(1); c.setViewportTransform([1,0,0,1,0,0]); setZoom(100); }}
            title="Resetar zoom"
            className="px-2 h-7 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium min-w-[46px] text-center tabular-nums">
            {zoom}%
          </button>
          <button
            onClick={() => { const c = fabricRef.current; if (!c) return; const z = Math.min(c.getZoom() * 1.25, 8); c.setZoom(z); setZoom(Math.round(z * 100)); }}
            className="w-7 h-7 rounded-lg text-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center leading-none">+</button>
        </div>

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
        <div className="w-36 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 max-h-[620px] overflow-y-auto select-none">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-1 mb-1">Elementos</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 px-1 mb-1">Arraste ou clique</p>
          {PALETTE.map(item => (
            <button
              key={item.id}
              onMouseDown={e => startPaletteDrag(e, item)}
              onClick={() => addPaletteItem(item)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition text-left w-full cursor-grab active:cursor-grabbing ${draggingItem?.id === item.id ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`}>
              <span className="text-base leading-none">{item.emoji}</span>
              <span className="truncate">{item.label}</span>
              {item.isBoothType && <span className="ml-auto text-[9px] text-purple-500 font-bold">LISTA</span>}
            </button>
          ))}
        </div>

        {/* Canvas wrapper */}
        <div
          ref={canvasWrapperRef}
          className={`flex-1 overflow-auto rounded-2xl border bg-slate-50 dark:bg-slate-950 transition-colors ${draggingItem ? 'border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/30' : 'border-slate-200 dark:border-slate-700'}`}
          style={{ minHeight: 620 }}
        >
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
                    {/* Delete booth from list */}
                    <button
                      onClick={() => deleteBoothFromList(booth.id)}
                      title="Remover barraca"
                      className="w-7 h-7 rounded-lg text-xs bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-100 flex items-center justify-center shrink-0">🗑</button>
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

      {/* ── Inline label editor overlay (dblclick on canvas element) ── */}
      {editingLabel && (
        <div
          style={{
            position: 'fixed',
            left: editingLabel.screen.left,
            top: editingLabel.screen.top,
            width: editingLabel.screen.width,
            zIndex: 9999,
          }}
          className="bg-white dark:bg-slate-900 border border-purple-500 rounded-xl shadow-xl p-2"
        >
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-1 px-1 truncate">{editingLabel.firstLine}</div>
          <input
            autoFocus
            value={editingLabel.customName}
            onChange={e => setEditingLabel(prev => prev ? { ...prev, customName: e.target.value } : null)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitLabelEditWithSync(editingLabel); commitLabelEdit(); }
              if (e.key === 'Escape') setEditingLabel(null);
            }}
            onBlur={() => { commitLabelEditWithSync(editingLabel); commitLabelEdit(); }}
            placeholder="Nome personalizado…"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-[9px] text-slate-400 mt-1 px-1">Enter para salvar · Esc para cancelar</p>
        </div>
      )}
    </div>
  );
}
