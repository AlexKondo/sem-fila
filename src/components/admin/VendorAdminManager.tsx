'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { Plus, Store, Link as LinkIcon, ToggleLeft, ToggleRight } from 'lucide-react';

const VendorSchema = z.object({
  event_id: z.string().uuid('Selecione um evento'),
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  avg_prep_time: z.number().int().min(1).max(120).default(10),
  payment_mode: z.enum(['prepaid', 'pay_on_pickup', 'optional']).default('prepaid'),
  accept_pix: z.boolean().default(true),
  accept_cash: z.boolean().default(true),
  accept_card: z.boolean().default(true),
});

type Event = { id: string; name: string; organizations: { name: string } | null };
type VendorProfile = { id: string; name: string | null; phone: string | null } | null;
type VendorEvent = { id: string; name: string } | null;
type Vendor = {
  id: string; name: string; description: string | null; active: boolean;
  avg_prep_time: number; payment_mode: string; created_at: string;
  events: VendorEvent; profiles: VendorProfile;
};

interface Props {
  initialVendors: Vendor[];
  events: Event[];
}

export default function VendorAdminManager({ initialVendors, events }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [showForm, setShowForm] = useState(false);
  const [linkEmail, setLinkEmail] = useState<{ vendorId: string; email: string } | null>(null);
  const [form, setForm] = useState({
    event_id: '', name: '', description: '', avg_prep_time: 10,
    payment_mode: 'prepaid' as const, accept_pix: true, accept_cash: true, accept_card: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linking, setLinking] = useState(false);

  async function createVendor() {
    setError('');
    const parsed = VendorSchema.safeParse({ ...form, avg_prep_time: Number(form.avg_prep_time) });
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vendors')
      .insert({ ...parsed.data, active: true })
      .select('*, events(id, name), profiles(id, name, phone)')
      .single();
    if (error) { setError(error.message); setSaving(false); return; }
    setVendors((prev) => [data as Vendor, ...prev]);
    setShowForm(false);
    setForm({ event_id: '', name: '', description: '', avg_prep_time: 10, payment_mode: 'prepaid', accept_pix: true, accept_cash: true, accept_card: true });
    setSaving(false);
  }

  async function toggleActive(vendor: Vendor) {
    const supabase = createClient();
    await supabase.from('vendors').update({ active: !vendor.active }).eq('id', vendor.id);
    setVendors((prev) => prev.map((v) => v.id === vendor.id ? { ...v, active: !v.active } : v));
  }

  async function linkOwnerByEmail(vendorId: string, email: string) {
    setLinkError('');
    setLinking(true);
    const supabase = createClient();

    // Busca o user pelo email via profiles (JOIN auth.users não é direto via client)
    // Usamos a função RPC ou buscamos via profiles — aqui consultamos profiles pelo email do auth
    const { data: users } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', (
        await supabase.rpc('get_user_id_by_email', { p_email: email })
      ).data);

    if (!users || users.length === 0) {
      // Fallback: busca direto por ID se o input for UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(email)) {
        setLinkError('Usuário não encontrado. Cole o UUID do usuário (disponível na aba Usuários).');
        setLinking(false);
        return;
      }
      // Trata o input como UUID direto
      const { error } = await supabase.from('vendors').update({ owner_id: email }).eq('id', vendorId);
      if (error) { setLinkError(error.message); setLinking(false); return; }
      setVendors((prev) => prev.map((v) => v.id === vendorId ? { ...v, profiles: { id: email, name: 'Atualizado', phone: null } } : v));
    } else {
      const { error } = await supabase.from('vendors').update({ owner_id: users[0].id }).eq('id', vendorId);
      if (error) { setLinkError(error.message); setLinking(false); return; }
      setVendors((prev) => prev.map((v) => v.id === vendorId ? { ...v, profiles: users[0] as VendorProfile } : v));
    }

    setLinkEmail(null);
    setLinking(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4 transition-colors duration-300">
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-orange-500 text-white font-semibold py-3 rounded-2xl hover:bg-orange-600 transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Nova barraca / loja
      </button>

      {/* Formulário nova barraca */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 space-y-3 border border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nova barraca</h3>
          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <select
            value={form.event_id}
            onChange={(e) => setForm((p) => ({ ...p, event_id: e.target.value }))}
            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="" className="dark:bg-slate-900">Selecione o evento</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id} className="dark:bg-slate-900">
                {ev.organizations?.name} — {ev.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Nome da barraca"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />
          <input
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Tempo médio (min)</label>
              <input
                type="number" min={1} max={120}
                value={form.avg_prep_time}
                onChange={(e) => setForm((p) => ({ ...p, avg_prep_time: parseInt(e.target.value) || 10 }))}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Modo de pagamento</label>
              <select
                value={form.payment_mode}
                onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value as typeof form.payment_mode }))}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="prepaid" className="dark:bg-slate-900">Pr-pago (online)</option>
                <option value="pay_on_pickup" className="dark:bg-slate-900">Pagar na retirada</option>
                <option value="optional" className="dark:bg-slate-900">Opcional</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            {(['accept_pix', 'accept_cash', 'accept_card'] as const).map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                  className="accent-orange-500 w-4 h-4"
                />
                {key === 'accept_pix' ? 'PIX' : key === 'accept_cash' ? 'Dinheiro' : 'Cartǜo'}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-400 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
            <button onClick={createVendor} disabled={saving} className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-lg shadow-orange-500/20">
              {saving ? 'Salvando...' : 'Criar barraca'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de vendors */}
      {vendors.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-600">
          <p className="text-4xl mb-3">🏪</p>
          <p>Nenhuma barraca criada ainda.</p>
        </div>
      ) : (
        vendors.map((vendor) => (
          <div key={vendor.id} className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-slate-100 dark:border-slate-800 transition-colors ${!vendor.active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-400" />
                  <p className="font-semibold text-gray-900 dark:text-white">{vendor.name}</p>
                </div>
                {vendor.events && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Evento: {vendor.events.name}</p>
                )}
                {vendor.description && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{vendor.description}</p>
                )}
              </div>
              <button onClick={() => toggleActive(vendor)} className="transition-transform active:scale-90">
                {vendor.active
                  ? <ToggleRight className="w-6 h-6 text-green-500" />
                  : <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-slate-600" />
                }
              </button>
            </div>

            {/* Dono vinculado */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Dono vinculado</p>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                  {vendor.profiles?.name ?? <span className="text-red-500 dark:text-red-400 text-xs">Nenhum dono vinculado</span>}
                </p>
              </div>
              <button
                onClick={() => { setLinkEmail({ vendorId: vendor.id, email: '' }); setLinkError(''); }}
                className="flex items-center gap-1.5 text-xs text-orange-500 dark:text-orange-400 border border-orange-200 dark:border-orange-900 px-2.5 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
              >
                <LinkIcon className="w-3 h-3" />
                {vendor.profiles ? 'Alterar dono' : 'Vincular dono'}
              </button>
            </div>

            {/* Form de vínculo */}
            {linkEmail?.vendorId === vendor.id && (
              <div className="mt-3 space-y-2">
                {linkError && <p className="text-red-600 dark:text-red-400 text-xs">{linkError}</p>}
                <input
                  placeholder="Cole o UUID do usuário"
                  value={linkEmail.email}
                  onChange={(e) => setLinkEmail((p) => p ? { ...p, email: e.target.value } : null)}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500">Encontre o UUID na pagina de Usurrios.</p>
                <div className="flex gap-2">
                  <button onClick={() => setLinkEmail(null)} className="flex-1 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 py-1.5 rounded-xl text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                  <button
                    onClick={() => linkOwnerByEmail(vendor.id, linkEmail.email)}
                    disabled={linking}
                    className="flex-1 bg-orange-500 text-white py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 shadow-lg shadow-orange-500/20"
                  >
                    {linking ? '...' : 'Vincular'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
