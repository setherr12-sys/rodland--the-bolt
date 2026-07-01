import { supabase, getSupabaseError } from './supabase';
import type { Room, Booking, RoomStatus, BookingStatus, PaymentStatus } from './types';

function getClient() {
  if (!supabase) {
    const message = getSupabaseError()?.message ?? 'Supabase client is unavailable. Check your environment variables.';
    throw new Error(message);
  }
  return supabase;
}

async function hasBookingConflict(roomId: number, checkIn: string, checkOut: string, excludeId?: number): Promise<boolean> {
  const client = getClient();
  let query = client
    .from('bookings')
    .select('id')
    .eq('room_id', roomId)
    .neq('status', 'cancelled')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
    .limit(1);

  if (excludeId !== undefined) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function loadRooms(): Promise<Room[]> {
  const client = getClient();
  const { data, error } = await client
    .from('rooms')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data as Room[];
}

export async function loadBookings(): Promise<Booking[]> {
  const client = getClient();
  const { data, error } = await client
    .from('bookings')
    .select('*, room:rooms(*)')
    .in('status', ['confirmed', 'extended'])
    .order('check_in');
  if (error) throw error;
  return data as Booking[];
}

export async function loadAllBookings(): Promise<Booking[]> {
  const client = getClient();
  const { data, error } = await client
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
  const client = getClient();
  const { error: updateError } = await client
    .from('rooms')
    .update({ status: newStatus })
    .eq('id', roomId);
  if (updateError) throw updateError;

  const { error: logError } = await client
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
  const client = getClient();
  const hasConflict = await hasBookingConflict(input.room_id, input.check_in, input.check_out);
  if (hasConflict) {
    throw new Error('This room is already occupied during the selected dates.');
  }

  const { data, error } = await client
    .from('bookings')
    .insert({ ...input, status: 'confirmed' })
    .select('*, room:rooms(*)')
    .single();
  if (error) throw error;

  // If check-in is today, set room to occupied
  const today = new Date().toISOString().slice(0, 10);
  if (input.check_in <= today && input.check_out > today) {
    const { data: roomData } = await client.from('rooms').select('status').eq('id', input.room_id).single();
    if (roomData) {
      await updateRoomStatus(input.room_id, 'occupied', roomData.status as RoomStatus, 'Auto-set on booking');
    }
  }

  return data as Booking;
}

export async function updateBooking(
  id: number,
  updates: {
    guest_name: string;
    room_id: number;
    check_in: string;
    check_out: string;
    nightly_rate: number;
    source: string;
    notes: string | null;
    payment_status: string;
    status?: BookingStatus;
  }
): Promise<void> {
  const client = getClient();
  const hasConflict = await hasBookingConflict(updates.room_id, updates.check_in, updates.check_out, id);
  if (hasConflict) {
    throw new Error('Cannot update: the new dates overlap with an existing booking.');
  }

  const { error } = await client
    .from('bookings')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBooking(id: number): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('bookings')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function cancelBooking(id: number, reason?: string): Promise<void> {
  const client = getClient();
  const { error } = await client
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
  const client = getClient();
  const { error } = await client
    .from('bookings')
    .update({ payment_status: paymentStatus })
    .eq('id', id);
  if (error) throw error;
}
