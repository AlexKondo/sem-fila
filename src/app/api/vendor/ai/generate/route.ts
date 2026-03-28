import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: {
    vendorId: string;
    menuItemId?: string;
    menuItemName?: string;
    prompt?: string;
    currentDescription?: string;
    category?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { vendorId, menuItemId, menuItemName, prompt, currentDescription, category } = body;
  if (!vendorId) {
    return NextResponse.json({ error: 'vendorId é obrigatório.' }, { status: 400 });
  }

  // Verifica ownership do vendor
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name, ai_photo_enabled, ai_photo_credits')
    .eq('id', vendorId)
    .eq('owner_id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });
  }

  if (!vendor.ai_photo_enabled) {
    return NextResponse.json({ error: 'IA não está habilitada. Ative nas configurações.' }, { status: 403 });
  }

  if ((vendor.ai_photo_credits || 0) < 1) {
    return NextResponse.json({ error: 'Créditos insuficientes. Compre mais créditos.' }, { status: 403 });
  }

  // Lê configurações do pacote (quantas imagens e descrições por crédito)
  const { data: configs } = await supabase.from('platform_config').select('key, value');
  const imagesPerCredit = parseInt(configs?.find(c => c.key === 'ai_images_per_credit')?.value || '10');
  const descriptionsPerCredit = parseInt(configs?.find(c => c.key === 'ai_descriptions_per_credit')?.value || '1');

  // PRIMEIRO gera o conteúdo — só deduz crédito se tudo der certo
  let descriptions: string[];
  let images: string[];

  try {
    // Gera descrições com IA real
    descriptions = [];
    for (let i = 0; i < descriptionsPerCredit; i++) {
      const desc = await generateDescription({
        itemName: menuItemName || 'Prato',
        category: category || undefined,
        currentDescription: currentDescription || undefined,
        userPrompt: prompt || undefined,
        vendorName: vendor.name,
        variation: i,
      });
      descriptions.push(desc);
    }

    // Busca fotos reais no Pexels + Unsplash
    images = await searchImages(
      menuItemName || category || 'prato comida',
      imagesPerCredit,
    );
  } catch (err: any) {
    console.error('[AI Generate Error]', err?.message || err);
    return NextResponse.json({
      error: 'Erro ao gerar conteúdo com IA. Nenhum crédito foi consumido, tente novamente.',
    }, { status: 500 });
  }

  // Geração OK — agora deduz 1 crédito
  const newCredits = (vendor.ai_photo_credits || 0) - 1;
  const { error: updateError } = await supabase
    .from('vendors')
    .update({ ai_photo_credits: newCredits })
    .eq('id', vendorId);

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao deduzir crédito.' }, { status: 500 });
  }

  // Registra o uso
  await supabase.from('ai_photo_usage').insert({
    vendor_id: vendorId,
    menu_item_id: menuItemId || null,
    menu_item_name: menuItemName || null,
    type: 'bundle',
    credits_used: 1,
    prompt: prompt || null,
  });

  return NextResponse.json({
    remaining_credits: newCredits,
    descriptions,
    images,
    bundle: { images_count: imagesPerCredit, descriptions_count: descriptionsPerCredit },
  });
}

async function generateDescription(opts: {
  itemName: string;
  category?: string;
  currentDescription?: string;
  userPrompt?: string;
  vendorName: string;
  variation: number;
}): Promise<string> {
  const { itemName, category, currentDescription, userPrompt, vendorName, variation } = opts;

  const systemPrompt = `Você é um copywriter especialista em gastronomia brasileira. Sua tarefa é criar descrições curtas, apetitosas e irresistíveis para itens de cardápio digital.

Regras:
- Máximo 2 frases (até 180 caracteres)
- Tom acolhedor e sensorial (mencione texturas, aromas, sabores)
- Não use emojis
- Não use aspas
- Não comece com "Experimente" ou "Saboreie" (varie os inícios)
- Responda APENAS com a descrição, sem explicações adicionais`;

  let userMessage = `Crie uma descrição para o item de cardápio "${itemName}"`;
  if (category) userMessage += ` da categoria "${category}"`;
  userMessage += ` do estabelecimento "${vendorName}".`;

  if (currentDescription) {
    userMessage += `\n\nDescrição atual: "${currentDescription}".\nMelhore esta descrição mantendo a essência.`;
  }

  if (userPrompt) {
    userMessage += `\n\nInstruções adicionais do vendor: ${userPrompt}`;
  }

  if (variation > 0) {
    userMessage += `\n\nEsta é a variação ${variation + 1}. Crie uma versão diferente da anterior, com outro estilo e vocabulário.`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0];
  if (text.type === 'text') {
    return text.text.trim();
  }

  return `${itemName} preparado com ingredientes selecionados e todo o carinho da casa.`;
}

async function searchImages(query: string, count: number): Promise<string[]> {
  // Busca em paralelo no Pexels e Unsplash para combinar resultados
  const [pexels, unsplash] = await Promise.all([
    searchPexels(query, count),
    searchUnsplash(query, count),
  ]);

  // Intercala resultados das duas fontes para variedade
  const combined: string[] = [];
  const maxLen = Math.max(pexels.length, unsplash.length);
  for (let i = 0; i < maxLen && combined.length < count; i++) {
    if (i < pexels.length) combined.push(pexels[i]);
    if (i < unsplash.length && combined.length < count) combined.push(unsplash[i]);
  }

  return combined;
}

async function searchPexels(query: string, count: number): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=square&size=small`;

    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      console.error('[Pexels API Error]', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const photos: { src: { medium: string } }[] = data.photos || [];

    return photos.map(p => p.src.medium);
  } catch (err: any) {
    console.error('[Pexels Search Error]', err?.message);
    return [];
  }
}

async function searchUnsplash(query: string, count: number): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=squarish`;

    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      console.error('[Unsplash API Error]', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const photos: { urls: { small: string } }[] = data.results || [];

    return photos.map(p => p.urls.small);
  } catch (err: any) {
    console.error('[Unsplash Search Error]', err?.message);
    return [];
  }
}
