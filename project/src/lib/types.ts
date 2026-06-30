export type RoomStatus = 'occupied' | 'ready' | 'needs_cleaning' | 'maintenance' | 'vacant';
export type BookingStatus = 'confirmed' | 'cancelled' | 'extended';
export type PaymentStatus = 'airbnb' | 'paid' | 'partial' | 'unpaid';
export type BookingSource = 'Airbnb' | 'Booking.com' | 'Direct' | 'Walk-in' | 'Other';

export interface Room {
  id: number;
  name: string;
  room_type: string;
  status: RoomStatus;
  base_rate: number;
  sort_order: number;
  created_at: string;
}

export interface Booking {
  id: number;
  room_id: number;
  guest_name: string;
  check_in: string;
  check_out: string;
  source: string;
  nightly_rate: number;
  notes: string | null;
  status: BookingStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  room?: Room;
}

export interface RoomStatusLog {
  id: number;
  room_id: number;
  old_status: RoomStatus;
  new_status: RoomStatus;
  changed_at: string;
  note: string | null;
}

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: Room;
        Insert: Omit<Room, 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Omit<Room, 'id'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at' | 'room'> & { id?: number; created_at?: string };
        Update: Partial<Omit<Booking, 'id' | 'room'>>;
      };
      room_status_log: {
        Row: RoomStatusLog;
        Insert: Omit<RoomStatusLog, 'id' | 'changed_at'> & { id?: number; changed_at?: string };
        Update: Partial<Omit<RoomStatusLog, 'id'>>;
      };
    };
  };
}

export const STATUS_LABELS: Record<RoomStatus, string> = {
  occupied: 'Occupied',
  ready: 'Ready',
  needs_cleaning: 'Needs Cleaning',
  maintenance: 'Maintenance',
  vacant: 'Vacant',
};

export const STATUS_COLORS: Record<RoomStatus, { bg: string; text: string; dot: string }> = {
  occupied:      { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  ready:         { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  needs_cleaning:{ bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  maintenance:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  vacant:        { bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400' },
};

export const PAYMENT_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  airbnb:  { bg: 'bg-rose-50',   text: 'text-rose-600' },
  paid:    { bg: 'bg-green-50',  text: 'text-green-700' },
  partial: { bg: 'bg-amber-50',  text: 'text-amber-700' },
  unpaid:  { bg: 'bg-slate-100', text: 'text-slate-600' },
};

export const SOURCE_COLORS: Record<string, string> = {
  Airbnb:       'text-rose-600',
  'Booking.com':'text-blue-600',
  Direct:       'text-emerald-600',
  'Walk-in':    'text-violet-600',
  Other:        'text-slate-500',
};
