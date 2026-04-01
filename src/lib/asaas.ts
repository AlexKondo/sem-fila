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

export async function createCreditCardCharge(params: {
  customerId: string;
  value: number;
  orderId: string;
  description: string;
  card: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string };
  holderInfo: { name: string; cpfCnpj: string; email?: string; phone?: string; postalCode?: string; addressNumber?: string };
  remoteIp?: string;
}): Promise<{ paymentId: string; cardToken?: string; cardLast4?: string }> {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().split('T')[0];

  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      customer: params.customerId,
      billingType: 'CREDIT_CARD',
      value: params.value,
      dueDate,
      externalReference: params.orderId,
      description: params.description,
      creditCard: {
        holderName: params.card.holderName,
        number: params.card.number.replace(/\s/g, ''),
        expiryMonth: params.card.expiryMonth,
        expiryYear: params.card.expiryYear,
        ccv: params.card.ccv,
      },
      creditCardHolderInfo: {
        name: params.holderInfo.name,
        email: params.holderInfo.email || 'cliente@quickpick.com.br',
        cpfCnpj: params.holderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: params.holderInfo.postalCode || '01310100',
        addressNumber: params.holderInfo.addressNumber || '0',
        phone: params.holderInfo.phone || '11999999999',
      },
      remoteIp: params.remoteIp || '127.0.0.1',
      tokenize: true,
    }),
  });
  const payment = await res.json();
  if (!payment.id) throw new Error(`Asaas card error: ${JSON.stringify(payment)}`);

  return {
    paymentId: payment.id,
    cardToken: payment.creditCardToken ?? undefined,
    cardLast4: payment.creditCard?.creditCardNumber?.slice(-4) ?? undefined,
  };
}

export async function createCreditCardChargeWithToken(params: {
  customerId: string;
  value: number;
  orderId: string;
  description: string;
  cardToken: string;
}): Promise<{ paymentId: string; }> {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().split('T')[0];

  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      customer: params.customerId,
      billingType: 'CREDIT_CARD',
      value: params.value,
      dueDate,
      externalReference: params.orderId,
      description: params.description,
      creditCardToken: params.cardToken,
    }),
  });
  const payment = await res.json();
  if (!payment.id) throw new Error(`Asaas token charge error: ${JSON.stringify(payment)}`);
  return { paymentId: payment.id };
}

// Apenas sandbox — simula confirmação de pagamento pelo Asaas
export async function simulatePayment(paymentId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/payments/${paymentId}/simulatePayment`, {
    method: 'POST',
    headers: h,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Asaas simulate error (${res.status}): ${JSON.stringify(data)}`);
  }
}

// Estorna uma cobrança Asaas (total ou parcial)
// value omitido = estorno total; value informado = estorno parcial
export async function refundPayment(paymentId: string, value?: number): Promise<void> {
  const body: Record<string, unknown> = {};
  if (value !== undefined) body.value = value;

  const res = await fetch(`${BASE_URL}/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Asaas refund error (${res.status}): ${JSON.stringify(data)}`);
  }
}
