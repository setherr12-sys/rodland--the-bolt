import { useState, useEffect, useCallback } from 'react';
import { loadRooms, loadBookings, loadAllBookings } from '../lib/actions';
import type { Room, Booking } from '../lib/types';

export function useAppData() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [r, b, ab] = await Promise.all([loadRooms(), loadBookings(), loadAllBookings()]);
      setRooms(r);
      setBookings(b);
      setAllBookings(ab);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rooms, bookings, allBookings, loading, error, refresh };
}
