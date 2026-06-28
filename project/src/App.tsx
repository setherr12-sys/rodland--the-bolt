import { useState, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import Sidebar, { type View } from './components/Sidebar';
import RoomsView from './components/RoomsView';
import CalendarView from './components/CalendarView';
import ReportsView from './components/ReportsView';
import QuickAddDrawer from './components/QuickAddDrawer';
import BookingDetailDrawer from './components/BookingDetailDrawer';
import ToastContainer from './components/ToastContainer';
import StatusBadge from './components/StatusBadge';
import { useAppData } from './hooks/useAppData';
import { useToast } from './hooks/useToast';
import type { Room, Booking, RoomStatus, PaymentStatus } from './lib/types';
import {
  updateRoomStatus,
  createBooking,
  cancelBooking,
  updatePaymentStatus,
  type BookingInput,
} from './lib/actions';
import { formatDate, toDateStr } from './lib/dateUtils';

export default function App() {
  const [view, setView] = useState<View>('rooms');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddRoomId, setQuickAddRoomId] = useState<number | undefined>();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { rooms, bookings, allBookings, loading, error, refresh } = useAppData();
  const { toasts, add: addToast, remove: removeToast } = useToast();

  function openNewBooking(roomId?: number) {
    setQuickAddRoomId(roomId);
    setQuickAddOpen(true);
  }

  const handleStatusChange = useCallback(async (room: Room, newStatus: RoomStatus) => {
    try {
      await updateRoomStatus(room.id, newStatus, room.status);
      addToast(`${room.name} → ${newStatus.replace('_', ' ')}`);
      await refresh();
    } catch (e) {
      addToast((e as Error).message, 'error');
    }
  }, [addToast, refresh]);

  const handleCreateBooking = useCallback(async (input: BookingInput) => {
    await createBooking(input);
    addToast(`Booking created for ${input.guest_name}`);
    await refresh();
  }, [addToast, refresh]);

  const handleCancelBooking = useCallback(async (id: number, reason?: string) => {
    await cancelBooking(id, reason);
    addToast('Booking cancelled', 'info');
    setSelectedBooking(null);
    await refresh();
  }, [addToast, refresh]);

  const handleUpdatePayment = useCallback(async (id: number, status: PaymentStatus) => {
    await updatePaymentStatus(id, status);
    addToast('Payment status updated');
    setSelectedBooking(prev => prev ? { ...prev, payment_status: status } : null);
    await refresh();
  }, [addToast, refresh]);

  const today = new Date();
  const todayCheckins = bookings.filter(b => b.check_in === toDateStr(today));
  const todayCheckouts = bookings.filter(b => b.check_out === toDateStr(today));
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png"
            alt="Rodland"
            className="w-16 h-16 rounded-2xl object-cover animate-pulse"
          />
          <p className="text-slate-500 text-sm font-medium">Loading Rodland Ops…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load data</p>
          <p className="text-slate-400 text-sm mt-1">{error}</p>
          <button onClick={refresh} className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100 font-sans">
      <Sidebar view={view} setView={setView} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="font-semibold text-slate-800 text-base leading-tight">
                {view === 'rooms' && 'Room Overview'}
                {view === 'calendar' && 'Calendar'}
                {view === 'reports' && 'Reports & Analytics'}
              </h1>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">
                {formatDate(today, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            {/* Quick stats */}
            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {occupiedCount}/{rooms.length} occupied
              </span>
              {todayCheckins.length > 0 && (
                <span className="text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full">
                  {todayCheckins.length} check-in{todayCheckins.length !== 1 ? 's' : ''} today
                </span>
              )}
              {todayCheckouts.length > 0 && (
                <span className="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                  {todayCheckouts.length} check-out{todayCheckouts.length !== 1 ? 's' : ''} today
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => openNewBooking()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {view === 'rooms' && (
            <RoomsView
              rooms={rooms}
              bookings={bookings}
              onStatusChange={handleStatusChange}
              onNewBooking={openNewBooking}
              onViewBooking={setSelectedBooking}
            />
          )}
          {view === 'calendar' && (
            <CalendarView
              rooms={rooms}
              bookings={bookings}
              onViewBooking={setSelectedBooking}
              onNewBooking={openNewBooking}
            />
          )}
          {view === 'reports' && (
            <ReportsView
              rooms={rooms}
              allBookings={allBookings}
            />
          )}
        </main>
      </div>

      {/* Drawers */}
      <QuickAddDrawer
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        rooms={rooms}
        onSave={handleCreateBooking}
        preselectedRoomId={quickAddRoomId}
      />
      <BookingDetailDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onCancel={handleCancelBooking}
        onUpdatePayment={handleUpdatePayment}
      />

      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
