// Validações Zod para pedidos
// skill: 4-data-security - valida inputs no servidor antes de processar

import { z } from 'zod';

export const CreateOrderSchema = z.object({
  vendor_id: z.string().uuid({ message: 'ID de vendedor inválido' }),
  table_number: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  payment_method: z.enum(['pix', 'cartão', 'dinheiro']).optional(),
  customer_name: z.string().max(200).optional(),
  customer_cpf: z.string().max(14).optional(),
  customer_email: z.string().email().optional(),
  use_saved_card: z.boolean().optional(),
  card_number: z.string().max(19).optional(),
  card_holder: z.string().max(200).optional(),
  card_expiry_month: z.string().max(2).optional(),
  card_expiry_year: z.string().max(4).optional(),
  card_cvv: z.string().max(4).optional(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid({ message: 'ID de item inválido' }),
        quantity: z.number().int().min(1).max(99),
        extras: z.array(z.object({ name: z.string(), price: z.number() })).optional(),
      })
    )
    .min(1, { message: 'Adicione ao menos 1 item ao pedido' })
    .max(50, { message: 'Máximo de 50 itens por pedido' }),
});

export const UpdateOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(['received', 'preparing', 'almost_ready', 'ready', 'delivered', 'cancelled']),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
