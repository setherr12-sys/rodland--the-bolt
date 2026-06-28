import { useState, useMemo } from 'react';
import { Download, TrendingUp, DollarSign, BedDouble, Percent } from 'lucide-react';
import type { Room, Booking } from '../lib/types';
import { PAYMENT_COLORS, SOURCE_COLORS } from '../lib/types';
import {
  formatDate, startOfMonth, endOfMonth, eachDayOfInterval,
  differenceInDays, subMonths, addMonths, toDateStr, formatUGX
} from '../lib/dateUtils';

interface Props {
  rooms: Room[];
  allBookings: Booking[];
}

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e'];

function BarChart({ data, height = 140 }: { data: { day: string; revenue: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 ${data.length * 12} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      {data.map((d, i) => {
        const barH = Math.max((d.revenue / max) * (height - 20), d.revenue > 0 ? 4 : 0);
        return (
          <g key={i}>
            <rect
              x={i * 12 + 1}
              y={height - 20 - barH}
              width={10}
              height={barH}
              rx={2}
              fill="#f59e0b"
              opacity={0.9}
            />
          </g>
        );
      })}
    </svg>
  );
}

function MiniPie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data</div>;
  let cumAngle = -Math.PI / 2;
  const R = 60, cx = 80, cy = 80;
  const paths = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cumAngle);
    const y1 = cy + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + R * Math.cos(cumAngle);
    const y2 = cy + R * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { path: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`, color: PIE_COLORS[i % PIE_COLORS.length], name: d.name, value: d.value };
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0">
        {paths.map((p, i) => <path key={i} d={p.path} fill={p.color} />)}
        <circle cx={cx} cy={cy} r={28} fill="white" />
      </svg>
      <div className="space-y-1.5">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}</span>
            <span className="font-medium text-slate-800 ml-auto pl-2">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsView({ rooms, allBookings }: Props) {
  const [monthDate, setMonthDate] = useState(new Date());

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthStartStr = toDateStr(monthStart);
  const monthEndStr = toDateStr(monthEnd);

  const monthBookings = useMemo(() =>
    allBookings.filter(b =>
      b.status === 'confirmed' &&
      b.check_in < monthEndStr &&
      b.check_out > monthStartStr
    ), [allBookings, monthStartStr, monthEndStr]);

  function clampedNights(b: Booking): number {
    const start = b.check_in > monthStartStr ? b.check_in : monthStartStr;
    const end = b.check_out < monthEndStr ? b.check_out : monthEndStr;
    return Math.max(0, differenceInDays(start, end) * -1);
  }

  const revenue = useMemo(() => monthBookings.reduce((s, b) => s + clampedNights(b) * b.nightly_rate, 0), [monthBookings]);
  const totalNights = rooms.length * differenceInDays(monthEnd, monthStart);
  const occupiedNights = useMemo(() => monthBookings.reduce((s, b) => s + clampedNights(b), 0), [monthBookings]);
  const occupancy = totalNights > 0 ? Math.round((occupiedNights / totalNights) * 100) : 0;
  const adr = occupiedNights > 0 ? Math.round(revenue / occupiedNights) : 0;

  const dailyData = useMemo(() => {
    const days = eachDayOfInterval(monthStart, new Date(monthEnd.getTime() - 86400000));
    return days.map(d => {
      const ds = toDateStr(d);
      const dayRevenue = monthBookings.reduce((s, b) => b.check_in <= ds && b.check_out > ds ? s + b.nightly_rate : s, 0);
      return { day: String(d.getDate()), revenue: dayRevenue };
    });
  }, [monthBookings, monthStart, monthEnd]);

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    monthBookings.forEach(b => { map[b.source] = (map[b.source] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthBookings]);

  const roomOccupancy = useMemo(() =>
    rooms.map(room => {
      const rb = monthBookings.filter(b => b.room_id === room.id);
      const nights = rb.reduce((s, b) => s + clampedNights(b), 0);
      const totalRoomNights = differenceInDays(monthEnd, monthStart);
      return {
        name: room.name,
        occupancy: totalRoomNights > 0 ? Math.round((nights / totalRoomNights) * 100) : 0,
        revenue: rb.reduce((s, b) => s + clampedNights(b) * b.nightly_rate, 0),
      };
    }), [rooms, monthBookings, monthStart, monthEnd]);

  function exportCSV() {
    const rows = [
      ['All monetary values in this export are UGX (Ugandan Shillings)'],
      ['Guest','Room','Check-in','Check-out','Nights','Rate','Total','Source','Payment'],
      ...monthBookings.map(b => {
        const n = differenceInDays(b.check_out, b.check_in) * -1 < 0
          ? differenceInDays(b.check_in, b.check_out) * -1
          : differenceInDays(b.check_out, b.check_in);
        return [b.guest_name, b.room?.name ?? '', b.check_in, b.check_out, n, b.nightly_rate, n * b.nightly_rate, b.source, b.payment_status];
      }),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rodland-report-${formatDate(monthDate, 'yyyy-MM')}-UGX.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: 'Revenue',        value: formatUGX(revenue), sub: formatDate(monthDate, 'MMMM yyyy'), icon: <DollarSign className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Occupancy',      value: `${occupancy}%`,                sub: `${occupiedNights}/${totalNights} nights`, icon: <Percent className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Bookings',       value: `${monthBookings.length}`,      sub: 'confirmed',      icon: <BedDouble className="w-5 h-5" />, color: 'text-amber-600 bg-amber-50' },
    { label: 'Avg Daily Rate', value: formatUGX(adr),                      sub: 'per occupied night', icon: <TrendingUp className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setMonthDate(m => subMonths(m, 1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">←</button>
          <h2 className="text-lg font-semibold text-slate-800">{formatDate(monthDate, 'MMMM yyyy')}</h2>
          <button onClick={() => setMonthDate(m => addMonths(m, 1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">→</button>
          <button onClick={() => setMonthDate(new Date())} className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
            Current Month
          </button>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${k.color}`}>{k.icon}</div>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{k.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-1">Daily Revenue — {formatDate(monthDate, 'MMMM yyyy')}</h3>
          <p className="text-xs text-slate-400 mb-4">Each bar = one night's revenue across all rooms</p>
          <BarChart data={dailyData} height={140} />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span>
            <span>{Math.ceil(dailyData.length / 2)}</span>
            <span>{dailyData.length}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-4">Booking Source</h3>
          <MiniPie data={sourceData} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Per-Room Performance — {formatDate(monthDate, 'MMMM yyyy')}</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Room</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500">Occupancy</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {roomOccupancy.map((r, i) => (
              <tr key={r.name} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                <td className="px-5 py-3 font-medium text-slate-700">{r.name}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${r.occupancy}%` }} />
                    </div>
                    <span className="text-slate-600 text-xs font-medium w-8 text-right">{r.occupancy}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatUGX(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td className="px-5 py-3 font-semibold text-slate-700">Total</td>
              <td className="px-5 py-3 text-right font-semibold text-slate-700">{occupancy}%</td>
              <td className="px-5 py-3 text-right font-bold text-slate-800">{formatUGX(revenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 text-sm">Bookings — {formatDate(monthDate, 'MMMM yyyy')}</h3>
          <span className="text-xs text-slate-400">{monthBookings.length} booking{monthBookings.length !== 1 ? 's' : ''}</span>
        </div>
        {monthBookings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No bookings for this month</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Guest','Room','Check-in','Check-out','Source','Total','Payment'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthBookings.map((b, i) => {
                const n = Math.max(0, differenceInDays(b.check_out, b.check_in));
                const pc = PAYMENT_COLORS[b.payment_status];
                return (
                  <tr key={b.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{b.guest_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.room?.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.check_in}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.check_out}</td>
                    <td className={`px-4 py-2.5 font-medium text-xs ${SOURCE_COLORS[b.source] ?? 'text-slate-600'}`}>{b.source}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{formatUGX(n * b.nightly_rate)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>{b.payment_status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
