import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Room, PaymentStatus } from '../lib/types';
import type { BookingInput } from '../lib/actions';
import { formatUGX } from '../lib/dateUtils';
import { bookingFormSchema } from '../lib/schema';

interface Props {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  onSave: (input: BookingInput) => Promise<void>;
  preselectedRoomId?: number;
}

const SOURCES = ['Airbnb', 'Booking.com', 'Direct', 'Walk-in', 'Other'];
const PAYMENT_OPTS: { value: PaymentStatus; label: string }[] = [
  { value: 'airbnb',  label: 'Airbnb (collected)' },
  { value: 'paid',    label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'unpaid',  label: 'Unpaid' },
];

const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function QuickAddDrawer({ open, onClose, rooms, onSave, preselectedRoomId }: Props) {
  const [form, setForm] = useState({
    room_id: preselectedRoomId ?? (rooms[0]?.id ?? 0),
    guest_name: '',
    check_in: today(),
    check_out: tomorrow(),
    source: 'Direct',
    nightly_rate: '',
    notes: '',
    payment_status: 'unpaid' as PaymentStatus,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      const roomId = preselectedRoomId ?? (rooms[0]?.id ?? 0);
      const room = rooms.find(r => r.id === roomId);
      setForm(f => ({
        ...f,
        room_id: roomId,
        nightly_rate: '',
        guest_name: '',
        notes: '',
        check_in: today(),
        check_out: tomorrow(),
        source: 'Direct',
        payment_status: 'unpaid',
      }));
      setErr('');
    }
  }, [open, preselectedRoomId, rooms]);

  const set = (key: string, val: string | number) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    const parsed = bookingFormSchema.safeParse({
      room_id: Number(form.room_id),
      guest_name: form.guest_name,
      check_in: form.check_in,
      check_out: form.check_out,
      source: form.source,
      nightly_rate: Number(form.nightly_rate),
      notes: form.notes,
      payment_status: form.payment_status,
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Please review the booking form.';
      setErr(message);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        room_id: parsed.data.room_id,
        guest_name: parsed.data.guest_name,
        check_in: parsed.data.check_in,
        check_out: parsed.data.check_out,
        source: parsed.data.source,
        nightly_rate: parsed.data.nightly_rate,
        notes: parsed.data.notes || undefined,
        payment_status: parsed.data.payment_status,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const nights = form.check_in && form.check_out
    ? Math.max(0, (new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000)
    : 0;
  const total = nights * Number(form.nightly_rate || 0);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 flex flex-col max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-4rem)] md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:w-96 md:rounded-none md:translate-y-0 ${
          open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-lg">New Booking</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-scroll px-6 pt-5 pb-28 space-y-4">
          {/* Room */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Room</label>
            <select
              value={form.room_id}
              onChange={e => {
                set('room_id', e.target.value);
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name} — {r.room_type}</option>
              ))}
            </select>
          </div>

          {/* Guest */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Guest Name *</label>
            <input
              type="text"
              value={form.guest_name}
              onChange={e => set('guest_name', e.target.value)}
              placeholder="Full name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Check-in</label>
              <input
                type="date"
                value={form.check_in}
                onChange={e => set('check_in', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Check-out</label>
              <input
                type="date"
                value={form.check_out}
                onChange={e => set('check_out', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Rate and Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nightly Rate (UGX)</label>
              <input
                type="number"
                min="1"
                value={form.nightly_rate}
                onChange={e => set('nightly_rate', e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
              <select
                value={form.source}
                onChange={e => set('source', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Payment */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Payment Status</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_OPTS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set('payment_status', o.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    form.payment_status === o.value
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          {/* Summary */}
          {nights > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{nights} night{nights !== 1 ? 's' : ''} × {formatUGX(Number(form.nightly_rate || 0))}</span>
                <span className="font-semibold text-slate-800">{formatUGX(total)}</span>
              </div>
            </div>
          )}

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          {/* Secondary action inside scrollable body */}
          <div>
            <button
              type="button"
              onClick={onClose}
              className="w-full border border-slate-200 text-slate-600 rounded-lg py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>

          <div className="h-4" />
        </form>

        {/* FOOTER — fixed primary action */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-slate-100 bg-white">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-amber-500 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Booking'}
          </button>
        </div>
      </div>
    </>
  );
}
