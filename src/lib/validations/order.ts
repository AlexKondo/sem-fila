// Validações Zod para pedidos
// skill: 4-data-security - valida inputs no servidor antes de processar

import { z } from 'zod';

export const CreateOrderSchema = z.object({
  vendor_id: z.string().uuid({ message: 'ID de vendedor inválido' }),
  table_number: z.string().max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid({ message: 'ID de item inválido' }),
        quantity: z.number().int().min(1).max(99),
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
