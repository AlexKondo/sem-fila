import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// POST: Cliente entra na fila de espera (não exige login)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendor_id, customer_name, customer_phone, party_size } = body;

    if (!vendor_id || !customer_name || !party_size || party_size < 1) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    // Usa service role pois clientes podem ser anônimos
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    // Calcula próxima posição na fila
    const { data: lastEntry } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('vendor_id', vendor_id)
      .in('status', ['waiting', 'called'])
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (lastEntry?.position ?? 0) + 1;

    const { data: entry, error } = await supabase
      .from('queue_entries')
      .insert({
        vendor_id,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone?.replace(/\D/g, '') || null,
        party_size: Math.min(party_size, 50),
        status: 'waiting',
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao entrar na fila:', error);
      return NextResponse.json({ error: 'Erro ao entrar na fila.' }, { status: 500 });
    }

    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// GET: Busca status da fila para um vendor (público)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendor_id');
  const entryId = searchParams.get('entry_id');

  if (!vendorId) {
    return NextResponse.json({ error: 'vendor_id obrigatório.' }, { status: 400 });
  }

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Busca mesas e fila em paralelo
  const [
    { data: tables },
    { data: queue },
    { data: myEntry },
  ] = await Promise.all([
    supabase
      .from('vendor_tables')
      .select('id, table_number, capacity, status, merged_with')
      .eq('vendor_id', vendorId)
      .order('table_number'),
    supabase
      .from('queue_entries')
      .select('id, customer_name, party_size, status, position, created_at')
      .eq('vendor_id', vendorId)
      .in('status', ['waiting', 'called'])
      .order('position', { ascending: true }),
    entryId
      ? supabase
          .from('queue_entries')
          .select('*')
          .eq('id', entryId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const totalTables = tables?.length ?? 0;
  const freeTables = tables?.filter(t => t.status === 'free').length ?? 0;
  const totalCapacity = tables?.filter(t => t.status === 'free').reduce((sum, t) => sum + t.capacity, 0) ?? 0;
  const waitingCount = queue?.filter(q => q.status === 'waiting').length ?? 0;

  // Estima tempo médio de rotação das mesas (baseado em occupied_at das mesas ocupadas)
  // Simplificação: 30 min por grupo se não houver dados reais
  const avgTurnoverMin = 30;
  const estimatedWaitMin = totalTables > 0
    ? Math.ceil((waitingCount / Math.max(totalTables, 1)) * avgTurnoverMin)
    : waitingCount * avgTurnoverMin;

  return NextResponse.json({
    tables: tables ?? [],
    queue: queue ?? [],
    myEntry: myEntry ?? null,
    stats: {
      totalTables,
      freeTables,
      totalCapacity,
      waitingCount,
      estimatedWaitMin,
      hasQueue: waitingCount > 0 || freeTables === 0,
    },
  });
}
