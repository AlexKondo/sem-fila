import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEventInviteEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json();
  const { event_id, vendor_email, vendor_id, fee_amount } = body;

  if (!event_id || !vendor_email) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  }

  // Inserir convite no banco
  const insertData: Record<string, any> = {
    event_id,
    vendor_email: vendor_email.trim(),
    fee_amount: parseFloat(fee_amount) || 0,
  };
  if (vendor_id) insertData.vendor_id = vendor_id;

  const { data: invitation, error: insertError } = await supabase
    .from('event_vendor_invitations')
    .insert(insertData)
    .select('*, vendors(name)')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // Buscar dados do evento e organização para o email
  const { data: event } = await supabase
    .from('events')
    .select('name, location, organizations(name)')
    .eq('id', event_id)
    .single();

  const vendorName = invitation.vendors?.name || '';
  const eventName = event?.name || 'Evento';
  const eventLocation = event?.location || '';
  const organizerName = (event?.organizations as any)?.name || 'Organizador';

  // Enviar email
  try {
    await sendEventInviteEmail({
      to: vendor_email.trim(),
      vendorName,
      eventName,
      eventLocation,
      feeAmount: parseFloat(fee_amount) || 0,
      organizerName,
    });
  } catch (emailError: any) {
    console.error('Erro ao enviar email de convite:', emailError);
    // Convite já foi salvo, retorna com aviso
    return NextResponse.json({
      invitation,
      emailSent: false,
      emailError: emailError.message,
    });
  }

  return NextResponse.json({ invitation, emailSent: true });
}
