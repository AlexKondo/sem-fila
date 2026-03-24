// Validações Zod para itens do cardápio
// skill: 4-data-security

import { z } from 'zod';

const MAX_IMAGE_SIZE_MB = 5;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const MenuItemSchema = z.object({
  vendor_id: z.string().uuid(),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  description: z.string().max(300).optional().nullable(),
  price: z.number().min(0, 'Preço deve ser positivo').max(9999.99),
  available: z.boolean().default(true),
  position: z.number().int().min(0).default(0),
  category: z.string().optional().nullable(),
  extras: z.array(z.object({ name: z.string(), price: z.number() })).optional().default([]),
});

export const MenuItemImageSchema = z.object({
  size: z.number().max(MAX_IMAGE_SIZE_MB * 1024 * 1024, `Imagem máxima: ${MAX_IMAGE_SIZE_MB}MB`),
  type: z.enum(ACCEPTED_IMAGE_TYPES as [string, ...string[]], {
    errorMap: () => ({ message: 'Formato aceito: JPG, PNG ou WebP' }),
  }),
});

export type MenuItemInput = z.infer<typeof MenuItemSchema>;
