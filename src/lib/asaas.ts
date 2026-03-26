// Cliente Asaas — sandbox se a chave começa com $aact_hmlg, produção caso contrário

const BASE_URL = process.env.ASAAS_API_KEY?.startsWith('$aact_hmlg')
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/api/v3';

export const IS_SANDBOX = process.env.ASAAS_API_KEY?.startsWith('$aact_hmlg') ?? false;

const h = {
  'access_token': process.env.ASAAS_API_KEY!,
  'Content-Type': 'application/json',
};

export async function findOrCreateCustomer(params: {
  name: string;
  cpfCnpj: string;
  email?: string;
}): Promise<string> {
  const cpf = params.cpfCnpj.replace(/\D/g, '');

  // Busca cliente existente pelo CPF
  const search = await fetch(`${BASE_URL}/customers?cpfCnpj=${cpf}`, { headers: h });
  const searchData = await search.json();
  if (searchData.data?.length > 0) return searchData.data[0].id;

  // Cria novo cliente
  const res = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      name: params.name,
      cpfCnpj: cpf,
      email: params.email ?? undefined,
      notificationDisabled: true,
    }),
  });
  const customer = await res.json();
  if (!customer.id) throw new Error(`Asaas customer error: ${JSON.stringify(customer)}`);
  return customer.id;
}

export async function createPixCharge(params: {
  customerId: string;
  value: number;
  orderId: string;
  description: string;
}): Promise<{ paymentId: string; pixQrCode: string; pixCopyPaste: string }> {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().split('T')[0];

  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      customer: params.customerId,
      billingType: 'PIX',
      value: params.value,
      dueDate,
      externalReference: params.orderId,
      description: params.description,
    }),
  });
  const payment = await res.json();
  if (!payment.id) throw new Error(`Asaas payment error: ${JSON.stringify(payment)}`);

  // Busca QR code PIX
  const qrRes = await fetch(`${BASE_URL}/payments/${payment.id}/pixQrCode`, { headers: h });
  const qr = await qrRes.json();

  return {
    paymentId: payment.id,
    pixQrCode: qr.encodedImage,   // base64 — usar em <img src="data:image/png;base64,...">
    pixCopyPaste: qr.payload,     // string para "copiar chave PIX"
  };
}

// Apenas sandbox — simula confirmação de pagamento pelo Asaas
export async function simulatePayment(paymentId: string): Promise<void> {
  await fetch(`${BASE_URL}/payments/${paymentId}/simulatePayment`, {
    method: 'POST',
    headers: h,
  });
}
