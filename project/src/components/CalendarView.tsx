import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  formatDate, isSameMonth, isToday, addMonths, subMonths, parseISO,
  isBefore, isAfter, differenceInDays, toDateStr
} from '../lib/dateUtils';
import type { Room, Booking } from '../lib/types';

interface Props {
  rooms: Room[];
  bookings: Booking[];
  onViewBooking: (b: Booking) => void;
  onNewBooking: (roomId?: number) => void;
}

const ROW_H = 28;

const ROOM_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-teal-500',
];

export default function CalendarView({ rooms, bookings, onViewBooking, onNewBooking }: Props) {
  const [monthDate, setMonthDate] = useState(new Date());

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, 1);
  const calEnd = endOfWeek(monthEnd, 1);
  const days = eachDayOfInterval(calStart, calEnd);

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const timelineDays = eachDayOfInterval(monthStart, new Date(monthEnd.getTime() - 86400000));

  function getBookingsForDay(day: Date): Booking[] {
    const d = toDateStr(day);
    return bookings.filter(b => b.check_in <= d && b.check_out > d);
  }

  function getRoomColor(roomId: number) {
    const idx = rooms.findIndex(r => r.id === roomId);
    return ROOM_COLORS[idx % ROOM_COLORS.length];
  }

  function getBookingSpan(booking: Booking) {
    const start = parseISO(booking.check_in);
    const end = parseISO(booking.check_out);
    const clampedStart = isBefore(start, monthStart) ? monthStart : start;
    const clampedEnd = isAfter(end, monthEnd) ? monthEnd : end;
    const startIdx = differenceInDays(clampedStart, monthStart);
    const spanDays = differenceInDays(clampedEnd, clampedStart);
    return { startIdx, spanDays };
  }

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const totalDays = timelineDays.length;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {formatDate(monthDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonthDate(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={() => setMonthDate(new Date())} className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
              Today
            </button>
            <button onClick={() => setMonthDate(m => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <button onClick={() => onNewBooking()} className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
          + New Booking
        </button>
      </div>

      {/* Mini calendar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500">{d}</div>
          ))}
        </div>
        <div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-slate-50 last:border-0">
              {week.map(day => {
                const dayBookings = getBookingsForDay(day);
                const inMonth = isSameMonth(day, monthDate);
                const todayFlag = isToday(day);
                return (
                  <div key={day.toISOString()} className={`min-h-[80px] p-1.5 border-r border-slate-50 last:border-0 ${!inMonth ? 'bg-slate-50/60' : ''}`}>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      todayFlag ? 'bg-amber-500 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 3).map(b => (
                        <button
                          key={b.id}
                          onClick={() => onViewBooking(b)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-xs text-white font-medium truncate ${getRoomColor(b.room_id)} hover:opacity-80 transition-opacity`}
                          title={`${b.guest_name} – ${b.room?.name}`}
                        >
                          {b.guest_name.split(' ')[0]}
                        </button>
                      ))}
                      {dayBookings.length > 3 && (
                        <p className="text-xs text-slate-400 pl-1">+{dayBookings.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="md:hidden text-xs text-center text-slate-400 mt-2 mb-4">
        Room timeline available on larger screens
      </p>

      {/* Room Timeline */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Room Timeline — {formatDate(monthDate, 'MMMM yyyy')}</h3>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(700, totalDays * 30 + 120) }}>
            <div className="flex border-b border-slate-100">
              <div className="w-28 shrink-0 px-4 py-2 text-xs font-medium text-slate-500">Room</div>
              <div className="flex-1 flex">
                {timelineDays.map(d => (
                  <div
                    key={d.toISOString()}
                    className={`flex-1 text-center py-2 text-xs font-medium border-l border-slate-50 ${isToday(d) ? 'text-amber-600 bg-amber-50' : 'text-slate-400'}`}
                    style={{ minWidth: 30 }}
                  >
                    {d.getDate()}
                  </div>
                ))}
              </div>
            </div>
            {rooms.map(room => {
              const roomBookings = confirmedBookings.filter(b => b.room_id === room.id);
              return (
                <div key={room.id} className="flex border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <div className="w-28 shrink-0 px-4 py-2 flex items-center">
                    <span className="text-xs font-medium text-slate-700">{room.name}</span>
                  </div>
                  <div className="flex-1 relative" style={{ height: ROW_H + 8 }}>
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timelineDays.map(d => (
                        <div
                          key={d.toISOString()}
                          className={`flex-1 border-l border-slate-50 ${isToday(d) ? 'bg-amber-50/60' : ''}`}
                          style={{ minWidth: 30 }}
                        />
                      ))}
                    </div>
                    {roomBookings.map(b => {
                      const { startIdx, spanDays } = getBookingSpan(b);
                      if (spanDays <= 0) return null;
                      const leftPct = (startIdx / totalDays) * 100;
                      const widthPct = (spanDays / totalDays) * 100;
                      return (
                        <button
                          key={b.id}
                          onClick={() => onViewBooking(b)}
                          title={`${b.guest_name} (${b.check_in} – ${b.check_out})`}
                          className={`absolute top-1 rounded text-white text-xs font-medium px-1.5 truncate hover:opacity-80 transition-opacity ${getRoomColor(b.room_id)}`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: ROW_H, lineHeight: `${ROW_H}px` }}
                        >
                          {b.guest_name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
