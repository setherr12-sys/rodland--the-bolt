import { useState } from 'react';
import { BedDouble, BedSingle, Clock, ChevronRight, Plus, Users } from 'lucide-react';
import type { Room, Booking, RoomStatus } from '../lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/types';
import StatusBadge from './StatusBadge';
import { formatDate, differenceInDays, formatUGX } from '../lib/dateUtils';

interface Props {
  rooms: Room[];
  bookings: Booking[];
  onStatusChange: (room: Room, newStatus: RoomStatus) => Promise<void>;
  onNewBooking: (roomId: number) => void;
  onViewBooking: (booking: Booking) => void;
}

const ALL_STATUSES: RoomStatus[] = ['occupied', 'ready', 'needs_cleaning', 'maintenance', 'vacant'];

function RoomCard({
  room,
  booking,
  onClick,
  selected,
}: {
  room: Room;
  booking?: Booking;
  onClick: () => void;
  selected: boolean;
}) {
  const nights = booking
    ? differenceInDays(new Date(booking.check_out), new Date(booking.check_in))
    : 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all duration-150 p-4 group ${
        selected
          ? 'border-amber-400 ring-2 ring-amber-100 bg-white shadow-md'
          : 'border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {room.room_type === '2BR Suite' ? (
            <BedDouble className="hidden sm:inline w-5 h-5 text-amber-500" />
          ) : (
            <BedSingle className="hidden sm:inline w-5 h-5 text-slate-400" />
          )}
          <span className="font-semibold text-slate-800">
            <span className="hidden sm:inline">Room </span>
            <span>{room.name.replace('Room ', '')}</span>
          </span>
        </div>
        <StatusBadge status={room.status} />
      </div>
      <p className="hidden sm:block text-xs text-slate-400 mb-3">{room.room_type} · {formatUGX(room.base_rate)}/night</p>
      {booking ? (
        <div className="bg-blue-50 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-blue-700 truncate">{booking.guest_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-blue-400" />
            <p className="text-xs text-blue-500">
              {formatDate(booking.check_in, 'MMM d')} → {formatDate(booking.check_out, 'MMM d')} · {nights}n
            </p>
          </div>
        </div>
      ) : (
        <div className="h-12 flex items-center justify-center bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-400">No active booking</p>
        </div>
      )}
    </button>
  );
}

function RoomDetailPanelContent({
  selected,
  activeBooking,
  upcomingBooking,
  roomBookings,
  changingStatus,
  onStatusChange,
  onViewBooking,
  onNewBooking,
}: {
  selected: Room;
  activeBooking: Booking | null | undefined;
  upcomingBooking: Booking | undefined;
  roomBookings: Booking[];
  changingStatus: boolean;
  onStatusChange: (status: RoomStatus) => void;
  onViewBooking: (booking: Booking) => void;
  onNewBooking: (roomId: number) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden md:rounded-none md:border-0 md:shadow-none">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-800 text-white">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg">{selected.name}</h3>
          <StatusBadge status={selected.status} />
        </div>
        <p className="text-slate-400 text-sm">{selected.room_type} · {formatUGX(selected.base_rate)}/night</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Status changer */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Change Status</p>
          <div className="space-y-1.5">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                disabled={changingStatus}
                onClick={() => onStatusChange(s)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-40 ${
                  selected.status === s
                    ? `${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} font-medium`
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s].dot}`} />
                {STATUS_LABELS[s]}
                {selected.status === s && <span className="ml-auto text-xs">Current</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Active booking */}
        {activeBooking && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Booking</p>
            <button
              onClick={() => onViewBooking(activeBooking)}
              className="w-full text-left bg-blue-50 rounded-xl p-3 hover:bg-blue-100 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-blue-800 text-sm">{activeBooking.guest_name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-blue-500 mt-1 pl-6">
                {formatDate(activeBooking.check_in, 'MMM d')} – {formatDate(activeBooking.check_out, 'MMM d')} · {activeBooking.source}
              </p>
            </button>
          </div>
        )}

        {/* Upcoming */}
        {upcomingBooking && !activeBooking && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Upcoming</p>
            <button
              onClick={() => onViewBooking(upcomingBooking)}
              className="w-full text-left bg-amber-50 rounded-xl p-3 hover:bg-amber-100 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-800 text-sm">{upcomingBooking.guest_name}</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xs text-amber-600 mt-0.5">
                {formatDate(upcomingBooking.check_in, 'MMM d')} – {formatDate(upcomingBooking.check_out, 'MMM d')}
              </p>
            </button>
          </div>
        )}

        {/* All bookings for this room */}
        {roomBookings.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">All Bookings</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {roomBookings.map(b => (
                <button
                  key={b.id}
                  onClick={() => onViewBooking(b)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <p className="text-sm text-slate-700 font-medium truncate">{b.guest_name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(b.check_in, 'MMM d')} – {formatDate(b.check_out, 'MMM d')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add booking CTA */}
        <button
          onClick={() => onNewBooking(selected.id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>
    </div>
  );
}

export default function RoomsView({ rooms, bookings, onStatusChange, onNewBooking, onViewBooking }: Props) {
  const [selected, setSelected] = useState<Room | null>(null);
  const [filterStatus, setFilterStatus] = useState<RoomStatus | 'all'>('all');
  const [changingStatus, setChangingStatus] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  function getActiveBooking(roomId: number) {
    return bookings.find(
      b => b.room_id === roomId && b.check_in <= today && b.check_out > today
    );
  }

  function getUpcomingBooking(roomId: number) {
    return bookings
      .filter(b => b.room_id === roomId && b.check_in > today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
  }

  function getRoomBookings(roomId: number) {
    return bookings.filter(b => b.room_id === roomId).sort((a, b) => a.check_in.localeCompare(b.check_in));
  }

  const filtered = filterStatus === 'all' ? rooms : rooms.filter(r => r.status === filterStatus);
  const activeBooking = selected ? getActiveBooking(selected.id) : null;
  const upcomingBooking = selected ? getUpcomingBooking(selected.id) : undefined;
  const roomBookings = selected ? getRoomBookings(selected.id) : [];

  async function handleStatusChange(newStatus: RoomStatus) {
    if (!selected || newStatus === selected.status) return;
    setChangingStatus(true);
    await onStatusChange(selected, newStatus);
    setChangingStatus(false);
    setSelected(prev => prev ? { ...prev, status: newStatus } : null);
  }

  // Stats
  const stats = {
    occupied: rooms.filter(r => r.status === 'occupied').length,
    ready: rooms.filter(r => r.status === 'ready').length,
    cleaning: rooms.filter(r => r.status === 'needs_cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    vacant: rooms.filter(r => r.status === 'vacant').length,
  };

  return (
    <div className="relative flex gap-6 h-full">
      {/* Left: Grid */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* KPI strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:gap-3">
          {[
            { label: 'Occupied',   count: stats.occupied,    color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { label: 'Ready',      count: stats.ready,       color: 'bg-green-50 text-green-700 border-green-100' },
            { label: 'Cleaning',   count: stats.cleaning,    color: 'bg-amber-50 text-amber-700 border-amber-100' },
            { label: 'Maintenance',count: stats.maintenance, color: 'bg-red-50 text-red-700 border-red-100' },
            { label: 'Vacant',     count: stats.vacant,      color: 'bg-slate-50 text-slate-600 border-slate-200' },
          ].map(s => (
            <div key={s.label} className={`flex-shrink-0 min-w-[100px] md:min-w-0 rounded-xl border px-4 py-3 ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({rooms.length})
          </button>
          {ALL_STATUSES.map(s => {
            const count = rooms.filter(r => r.status === s).length;
            if (count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filterStatus === s
                    ? `${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} ring-1 ring-current`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {STATUS_LABELS[s]} ({count})
              </button>
            );
          })}
        </div>

        {/* Room grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-min">
          {filtered.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              booking={getActiveBooking(room.id)}
              onClick={() => setSelected(prev => prev?.id === room.id ? null : room)}
              selected={selected?.id === room.id}
            />
          ))}
        </div>
      </div>

      {/* Desktop panel — hidden on mobile */}
      <div className={`hidden md:block w-80 flex-shrink-0 border-l border-slate-200 overflow-y-auto transition-all ${selected ? 'md:block' : 'md:hidden'}`}>
        {selected && (
          <RoomDetailPanelContent
            selected={selected}
            activeBooking={activeBooking}
            upcomingBooking={upcomingBooking}
            roomBookings={roomBookings}
            changingStatus={changingStatus}
            onStatusChange={handleStatusChange}
            onViewBooking={onViewBooking}
            onNewBooking={onNewBooking}
          />
        )}
      </div>

      {/* Mobile bottom sheet */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setSelected(null)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: '72vh' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            <RoomDetailPanelContent
              selected={selected}
              activeBooking={activeBooking}
              upcomingBooking={upcomingBooking}
              roomBookings={roomBookings}
              changingStatus={changingStatus}
              onStatusChange={handleStatusChange}
              onViewBooking={onViewBooking}
              onNewBooking={onNewBooking}
            />
          </div>
        </>
      )}
    </div>
  );
}
