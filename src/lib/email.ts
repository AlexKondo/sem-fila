import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SENDER_EMAIL!,
    pass: process.env.BREVO_API_KEY!,
  },
});

export async function sendEventInviteEmail({
  to,
  vendorName,
  eventName,
  eventLocation,
  feeAmount,
  organizerName,
}: {
  to: string;
  vendorName: string;
  eventName: string;
  eventLocation?: string;
  feeAmount: number;
  organizerName: string;
}) {
  const feeFormatted = feeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  await transporter.sendMail({
    from: `"${process.env.BREVO_SENDER_NAME || 'QuickPick'}" <${process.env.BREVO_SENDER_EMAIL}>`,
    to,
    subject: `Convite para participar do evento "${eventName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a0533, #7c3aed); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">QuickPick</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 5px 0 0; font-size: 13px;">Convite para Evento</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Olá <strong>${vendorName || 'Fornecedor'}</strong>,
          </p>

          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Você foi convidado por <strong>${organizerName}</strong> para participar do evento:
          </p>

          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #111827; margin: 0 0 8px; font-size: 18px;">${eventName}</h2>
            ${eventLocation ? `<p style="color: #6b7280; margin: 0 0 8px; font-size: 14px;">📍 ${eventLocation}</p>` : ''}
            <p style="color: #7c3aed; font-weight: bold; margin: 0; font-size: 16px;">Taxa de participação: R$ ${feeFormatted}</p>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Acesse sua conta no QuickPick para aceitar ou recusar o convite.
          </p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sem-fila.vercel.app'}/login"
               style="background: #7c3aed; color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Acessar minha conta
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Este email foi enviado automaticamente pelo QuickPick. Se você não esperava este convite, pode ignorar esta mensagem.
          </p>
        </div>
      </div>
    `,
  });
}
