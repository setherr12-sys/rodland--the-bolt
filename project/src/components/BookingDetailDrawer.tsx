import { useState } from 'react';
import { X, Calendar, DollarSign, MapPin, FileText, AlertTriangle } from 'lucide-react';
import type { Booking, PaymentStatus } from '../lib/types';
import { PAYMENT_COLORS, SOURCE_COLORS } from '../lib/types';
import { formatDate, differenceInDays, formatUGX } from '../lib/dateUtils';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onCancel: (id: number, reason?: string) => Promise<void>;
  onUpdatePayment: (id: number, status: PaymentStatus) => Promise<void>;
}

const PAYMENT_OPTS: { value: PaymentStatus; label: string }[] = [
  { value: 'airbnb',  label: 'Airbnb' },
  { value: 'paid',    label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'unpaid',  label: 'Unpaid' },
];

export default function BookingDetailDrawer({ booking, onClose, onCancel, onUpdatePayment }: Props) {
  const [cancelMode, setCancelMode] = useState(false);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);

  const open = !!booking;

  if (!booking) {
    return (
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 overflow-y-auto flex flex-col max-h-[calc(100vh-4rem)] md:max-h-none md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:w-96 md:rounded-none translate-y-full md:translate-x-full md:translate-y-0`}
      />
    );
  }

  const nights = differenceInDays(booking.check_out, booking.check_in);
  const total = nights * booking.nightly_rate;
  const pc = PAYMENT_COLORS[booking.payment_status];

  async function handleCancel() {
    setWorking(true);
    try {
      await onCancel(booking!.id, reason.trim() || undefined);
      setCancelMode(false);
      onClose();
    } finally {
      setWorking(false);
    }
  }

  async function handlePayment(status: PaymentStatus) {
    setWorking(true);
    try {
      await onUpdatePayment(booking!.id, status);
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 overflow-y-auto flex flex-col max-h-[calc(100vh-4rem)] md:max-h-none md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:w-96 md:rounded-none md:translate-y-0 ${
          open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">{booking.guest_name}</h2>
            <p className="text-xs text-slate-500">{booking.room?.name} · #{booking.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {booking.status === 'cancelled' && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Cancelled</p>
                {booking.cancellation_reason && (
                  <p className="text-xs text-red-500 mt-0.5">{booking.cancellation_reason}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Check-in</span>
              <span className="font-medium text-slate-800 ml-auto">
                {formatDate(booking.check_in, 'EEE, MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Check-out</span>
              <span className="font-medium text-slate-800 ml-auto">
                {formatDate(booking.check_out, 'EEE, MMM d, yyyy')}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
              <span className="text-slate-500">{nights} night{nights !== 1 ? 's' : ''}</span>
              <span className="font-semibold text-slate-800">{formatUGX(total)} total</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500">Source</span>
              <span className={`ml-auto font-medium ${SOURCE_COLORS[booking.source] ?? 'text-slate-700'}`}>{booking.source}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500">Rate</span>
              <span className="ml-auto font-medium text-slate-800">{formatUGX(booking.nightly_rate)}/night</span>
            </div>
          </div>

          {booking.notes && (
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                <FileText className="w-3.5 h-3.5" />
                Notes
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{booking.notes}</p>
            </div>
          )}

          {booking.status === 'confirmed' && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Payment Status</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTS.map(o => (
                  <button
                    key={o.value}
                    disabled={working}
                    onClick={() => handlePayment(o.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all disabled:opacity-50 ${
                      booking.payment_status === o.value
                        ? `border-transparent ${PAYMENT_COLORS[o.value].bg} ${PAYMENT_COLORS[o.value].text}`
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {booking.status === 'confirmed' && !cancelMode && (
            <button
              onClick={() => setCancelMode(true)}
              className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Cancel Booking
            </button>
          )}

          {cancelMode && (
            <div className="bg-red-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-red-700">Confirm Cancellation</p>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="Reason (optional)"
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none bg-white"
              />
              <div className="flex gap-2">
                <button onClick={() => setCancelMode(false)} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-white transition-colors">Back</button>
                <button
                  onClick={handleCancel}
                  disabled={working}
                  className="flex-1 py-2 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {working ? 'Cancelling…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
