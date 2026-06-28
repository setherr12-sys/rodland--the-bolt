import { supabase } from './supabase';
import type { Room, Booking, RoomStatus, BookingStatus, PaymentStatus } from './types';

export async function loadRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data as Room[];
}

export async function loadBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, room:rooms(*)')
    .eq('status', 'confirmed')
    .order('check_in');
  if (error) throw error;
  return data as Booking[];
}

export async function loadAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, room:rooms(*)')
    .order('check_in');
  if (error) throw error;
  return data as Booking[];
}

export async function updateRoomStatus(
  roomId: number,
  newStatus: RoomStatus,
  oldStatus: RoomStatus,
  note?: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from('rooms')
    .update({ status: newStatus })
    .eq('id', roomId);
  if (updateError) throw updateError;

  const { error: logError } = await supabase
    .from('room_status_log')
    .insert({ room_id: roomId, old_status: oldStatus, new_status: newStatus, note: note ?? null });
  if (logError) throw logError;
}

export interface BookingInput {
  room_id: number;
  guest_name: string;
  check_in: string;
  check_out: string;
  source: string;
  nightly_rate: number;
  notes?: string;
  payment_status: PaymentStatus;
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...input, status: 'confirmed' })
    .select('*, room:rooms(*)')
    .single();
  if (error) throw error;

  // If check-in is today, set room to occupied
  const today = new Date().toISOString().slice(0, 10);
  if (input.check_in <= today && input.check_out > today) {
    const { data: roomData } = await supabase.from('rooms').select('status').eq('id', input.room_id).single();
    if (roomData) {
      await updateRoomStatus(input.room_id, 'occupied', roomData.status as RoomStatus, 'Auto-set on booking');
    }
  }

  return data as Booking;
}

export async function updateBooking(id: number, updates: Partial<BookingInput>): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function cancelBooking(id: number, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled' as BookingStatus,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function updatePaymentStatus(id: number, paymentStatus: PaymentStatus): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ payment_status: paymentStatus })
    .eq('id', id);
  if (error) throw error;
}
