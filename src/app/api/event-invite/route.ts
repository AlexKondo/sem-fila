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

  // Resolve vendor_id: se não foi informado, busca pelo email
  let resolvedVendorId = vendor_id || null;

  if (!resolvedVendorId) {
    // Busca o profile pelo email para encontrar o owner_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', vendor_email.trim())
      .maybeSingle();

    if (profile) {
      // Busca o vendor desse owner
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)
        .maybeSingle();

      if (vendor) resolvedVendorId = vendor.id;
    }
  }

  if (!resolvedVendorId) {
    return NextResponse.json({
      error: 'Este email não está cadastrado na plataforma. O fornecedor precisa se registrar primeiro.'
    }, { status: 400 });
  }

  // Inserir convite no banco (sempre com vendor_id)
  const { data: invitation, error: insertError } = await supabase
    .from('event_vendor_invitations')
    .insert({
      event_id,
      vendor_email: vendor_email.trim(),
      vendor_id: resolvedVendorId,
      fee_amount: parseFloat(fee_amount) || 0,
    })
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
    return NextResponse.json({
      invitation,
      emailSent: false,
      emailError: emailError.message,
    });
  }

  return NextResponse.json({ invitation, emailSent: true });
}
