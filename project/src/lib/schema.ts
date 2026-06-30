import { z } from 'zod';

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in yyyy-MM-dd format.');

export const bookingTableSchema = z
  .object({
    room_id: z.coerce.number().int().positive('Select a room.'),
    guest_name: z.string().trim().min(1, 'Guest name is required.'),
    check_in: dateStringSchema,
    check_out: dateStringSchema,
    source: z.enum(['Airbnb', 'Booking.com', 'Direct', 'Walk-in', 'Other']),
    nightly_rate: z.coerce.number().int().positive('Valid nightly rate required.'),
    notes: z.string().trim().max(500).optional(),
    payment_status: z.enum(['airbnb', 'paid', 'partial', 'unpaid']),
    status: z.enum(['confirmed', 'cancelled']).optional().default('confirmed'),
  })
  .superRefine((data, ctx) => {
    const checkIn = new Date(`${data.check_in}T00:00:00`);
    const checkOut = new Date(`${data.check_out}T00:00:00`);

    if (!Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut <= checkIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['check_out'],
        message: 'Check-out must be after check-in.',
      });
    }
  });

export const bookingFormSchema = bookingTableSchema.omit({ status: true });

export type BookingTableInput = z.infer<typeof bookingTableSchema>;
export type BookingFormInput = z.infer<typeof bookingFormSchema>;
