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

type LaneRole = 'start' | 'mid' | 'end' | 'solo' | 'empty';

type LaneAssignment = {
  booking: Booking;
  laneIndex: number;
  role: LaneRole[];
};

function buildWeekLanes(weekDays: Date[], bookings: Booking[]): LaneAssignment[] {
  const assignments: LaneAssignment[] = [];
  const occupiedLanes: number[] = [];

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const activeBookings = bookings
    .filter(b => {
      const ci = new Date(b.check_in);
      const co = new Date(b.check_out);
      return ci <= weekEnd && co > weekStart;
    })
    .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());

  for (const booking of activeBookings) {
    let lane = 0;
    while (occupiedLanes[lane] !== undefined && occupiedLanes[lane] !== booking.id) {
      lane++;
    }
    occupiedLanes[lane] = booking.id;

    const roles: LaneRole[] = weekDays.map((day, idx) => {
      const dayStr = toDateStr(day);
      const ciStr = booking.check_in;
      const coStr = booking.check_out;

      if (dayStr < ciStr || dayStr >= coStr) return 'empty';

      const isStart = dayStr === ciStr;
      const nextDay = weekDays[idx + 1];
      const nextDayStr = nextDay ? toDateStr(nextDay) : null;
      const continuesAfterWeek = idx === 6 && dayStr < coStr;
      const isEnd = !nextDayStr || nextDayStr >= coStr || continuesAfterWeek;

      if (isStart && isEnd) return 'solo';
      if (isStart) return 'start';
      if (isEnd) return 'end';
      return 'mid';
    });

    assignments.push({ booking, laneIndex: lane, role: roles });
  }

  return assignments;
}

function renderDayCell(
  dayIndex: number,
  weekLanes: LaneAssignment[],
  roomColors: Record<number, string>,
  onViewBooking: (b: Booking) => void,
) {
  const maxLane = Math.max(0, ...weekLanes.map(a => a.laneIndex));

  return (
    <div className="flex flex-col gap-0.5 pt-1">
      {Array.from({ length: maxLane + 1 }, (_, lane) => {
        const assignment = weekLanes.find(a => a.laneIndex === lane);
        if (!assignment) return <div key={lane} className="h-6" />;

        const role = assignment.role[dayIndex];
        if (role === 'empty') return <div key={lane} className="h-6" />;

        const color = roomColors[assignment.booking.room_id];
        const showLabel = role === 'start' || role === 'solo';

        const borderRadius = {
          solo: 'rounded',
          start: 'rounded-l rounded-r-none',
          mid: 'rounded-none',
          end: 'rounded-r rounded-l-none',
        }[role];

        const marginLeft = role === 'mid' || role === 'end' ? '-ml-px' : '';
        const marginRight = role === 'mid' || role === 'start' ? '-mr-px' : '';

        return (
          <button
            key={lane}
            type="button"
            onClick={() => onViewBooking(assignment.booking)}
            title={`${assignment.booking.guest_name} – ${assignment.booking.room?.name ?? ''}`}
            className={`h-6 flex items-center px-1.5 text-white text-xs font-medium cursor-pointer
              ${color} ${borderRadius} ${marginLeft} ${marginRight}
              overflow-hidden whitespace-nowrap hover:opacity-90 transition-opacity`}
          >
            {showLabel ? assignment.booking.guest_name.split(' ')[0] : ''}
          </button>
        );
      })}
    </div>
  );
}

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

  const roomColors: Record<number, string> = {};
  rooms.forEach(r => {
    const idx = rooms.findIndex(x => x.id === r.id);
    roomColors[r.id] = ROOM_COLORS[idx % ROOM_COLORS.length];
  });

  function getRoomColor(roomId: number) {
    return roomColors[roomId] ?? ROOM_COLORS[0];
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
    <div className="flex flex-col gap-6 min-h-0">
      <div className="flex items-center justify-between shrink-0">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500">{d}</div>
          ))}
        </div>
        <div>
          {weeks.map((weekDays, weekIdx) => {
            const weekLanes = buildWeekLanes(weekDays, bookings);
            return (
              <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-50 last:border-0">
                {weekDays.map((day, dayIdx) => {
                  const inMonth = isSameMonth(day, monthDate);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[80px] border-t border-slate-100 p-1 border-r border-slate-50 last:border-r-0 ${!inMonth ? 'bg-slate-50/60' : ''}`}
                    >
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday(day) ? 'bg-amber-500 text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}
                      >
                        {day.getDate()}
                      </div>
                      {renderDayCell(dayIdx, weekLanes, roomColors, onViewBooking)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="md:hidden text-xs text-center text-slate-400 mt-2 mb-4">
        Room timeline available on larger screens
      </p>

      {/* Room Timeline */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Room Timeline — {formatDate(monthDate, 'MMMM yyyy')}</h3>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${totalDays * 30 + 140}px` }}>
            <div className="flex border-b border-slate-100">
              <div className="w-28 shrink-0 px-4 py-2 text-xs font-medium text-slate-500">Room</div>
              <div className="flex-1 flex">
                {timelineDays.map(d => {
                  const isTodayCol = isToday(d) && isSameMonth(d, monthDate);
                  return (
                    <div
                      key={d.toISOString()}
                      className={`flex-1 text-center py-2 text-xs font-medium border-l border-slate-50 ${isTodayCol ? 'text-amber-600 bg-amber-50' : 'text-slate-400'}`}
                      style={{ minWidth: 30 }}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
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
                      {timelineDays.map(d => {
                        const isTodayCol = isToday(d) && isSameMonth(d, monthDate);
                        return (
                          <div
                            key={d.toISOString()}
                            className={`flex-1 border-l border-slate-50 ${isTodayCol ? 'bg-amber-50' : ''}`}
                            style={{ minWidth: 30 }}
                          />
                        );
                      })}
                    </div>
                    {roomBookings.map(b => {
                      const { startIdx, spanDays } = getBookingSpan(b);
                      if (spanDays <= 0) return null;
                      const leftPct = (startIdx / totalDays) * 100;
                      const widthPct = (spanDays / totalDays) * 100;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => onViewBooking(b)}
                          title={`${b.guest_name} (${b.check_in} – ${b.check_out})`}
                          className={`absolute top-1 flex items-center px-2 rounded text-white text-xs font-medium overflow-hidden hover:opacity-80 transition-opacity ${getRoomColor(b.room_id)}`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: ROW_H }}
                        >
                          <span className="truncate">{b.guest_name}</span>
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
