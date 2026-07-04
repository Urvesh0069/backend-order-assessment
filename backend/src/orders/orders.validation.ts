import { z } from 'zod';

export const orderRowSchema = z.object({
  order_id: z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  }, z.string().uuid().optional()),
  customer_id: z.string().min(1),
  order_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  order_amount: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: 'order_amount must be a number',
  }),
  status: z.string().min(1),
});

export type ValidatedOrderRow = z.infer<typeof orderRowSchema>;