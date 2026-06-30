import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, MapPin, FileText, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import type { Booking, BookingStatus, PaymentStatus, Room } from '../lib/types';
import { PAYMENT_COLORS, SOURCE_COLORS } from '../lib/types';
import { formatDate, differenceInDays, formatUGX } from '../lib/dateUtils';

interface Props {
  booking: Booking | null;
  rooms: Room[];
  onClose: () => void;
  onCancel: (id: number, reason?: string) => Promise<void>;
  onUpdatePayment: (id: number, status: PaymentStatus) => Promise<void>;
  onUpdateBooking: (
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
  ) => Promise<void>;
  onDeleteBooking: (id: number) => Promise<void>;
}

const SOURCES = ['Airbnb', 'Booking.com', 'Direct', 'Walk-in', 'Other'];

const PAYMENT_OPTS: { value: PaymentStatus; label: string }[] = [
  { value: 'airbnb',  label: 'Airbnb' },
  { value: 'paid',    label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'unpaid',  label: 'Unpaid' },
];

type EditForm = {
  guest_name: string;
  room_id: number;
  check_in: string;
  check_out: string;
  nightly_rate: number;
  source: string;
  notes: string;
  payment_status: PaymentStatus;
};

function bookingToForm(booking: Booking): EditForm {
  return {
    guest_name: booking.guest_name,
    room_id: booking.room_id,
    check_in: booking.check_in,
    check_out: booking.check_out,
    nightly_rate: booking.nightly_rate,
    source: booking.source,
    notes: booking.notes ?? '',
    payment_status: booking.payment_status,
  };
}

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

export default function BookingDetailDrawer({
  booking,
  rooms,
  onClose,
  onCancel,
  onUpdatePayment,
  onUpdateBooking,
  onDeleteBooking,
}: Props) {
  const [cancelMode, setCancelMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [extensionMode, setExtensionMode] = useState(false);
  const [extensionNote, setExtensionNote] = useState('');
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const [editErr, setEditErr] = useState('');

  const open = !!booking;

  useEffect(() => {
    setCancelMode(false);
    setDeleteMode(false);
    setEditing(false);
    setExtensionMode(false);
    setExtensionNote('');
    setEditForm(null);
    setReason('');
    setEditErr('');
  }, [booking?.id]);

  if (!booking) {
    return (
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 overflow-y-auto flex flex-col max-h-[calc(100vh-4rem)] md:max-h-none md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:w-96 md:rounded-none translate-y-full md:translate-x-full md:translate-y-0`}
      />
    );
  }

  const nights = differenceInDays(booking.check_out, booking.check_in);
  const total = nights * booking.nightly_rate;
  const editNights = editForm
    ? Math.max(0, (new Date(editForm.check_out).getTime() - new Date(editForm.check_in).getTime()) / 86400000)
    : 0;
  const editTotal = editForm ? editNights * editForm.nightly_rate : 0;

  function startEditing() {
    if (!booking) return;
    setEditForm(bookingToForm(booking));
    setEditing(true);
    setExtensionMode(false);
    setExtensionNote('');
    setEditErr('');
    setCancelMode(false);
    setDeleteMode(false);
  }

  function discardEdit() {
    setEditing(false);
    setEditForm(null);
    setEditErr('');
  }

  async function handleCancel() {
    if (!booking) return;
    setWorking(true);
    try {
      await onCancel(booking.id, reason.trim() || undefined);
      setCancelMode(false);
      onClose();
    } finally {
      setWorking(false);
    }
  }

  async function handlePayment(status: PaymentStatus) {
    if (!booking) return;
    setWorking(true);
    try {
      await onUpdatePayment(booking.id, status);
      if (editForm) setEditForm(f => f ? { ...f, payment_status: status } : f);
    } finally {
      setWorking(false);
    }
  }

  async function handleSaveEdit() {
    if (!editForm || !booking) return;
    if (!editForm.guest_name.trim()) { setEditErr('Guest name is required.'); return; }
    if (editForm.check_out <= editForm.check_in) { setEditErr('Check-out must be after check-in.'); return; }
    if (!editForm.nightly_rate || editForm.nightly_rate <= 0) { setEditErr('Valid nightly rate required.'); return; }

    setWorking(true);
    setEditErr('');
    try {
      await onUpdateBooking(booking.id, {
        guest_name: editForm.guest_name.trim(),
        room_id: editForm.room_id,
        check_in: editForm.check_in,
        check_out: editForm.check_out,
        nightly_rate: editForm.nightly_rate,
        source: editForm.source,
        notes: editForm.notes.trim() || null,
        payment_status: editForm.payment_status,
        status: extensionMode ? 'extended' : undefined,
      });
      setEditing(false);
      setExtensionMode(false);
      setEditForm(null);
    } catch (e) {
      setEditErr((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  function handleExtend() {
    if (!booking) return;
    setEditForm(bookingToForm(booking));
    setExtensionMode(true);
    setEditing(true);
    setEditErr('');
    setCancelMode(false);
    setDeleteMode(false);
  }

  async function handleDelete() {
    if (!booking) return;
    if (!window.confirm('Are you sure? This will permanently remove the booking and all associated records.')) return;
    setWorking(true);
    try {
      await onDeleteBooking(booking.id);
      onClose();
    } finally {
      setWorking(false);
    }
  }

  const setEdit = (key: keyof EditForm, val: string | number) => {
    setEditForm(f => f ? { ...f, [key]: val } : f);
  };

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
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-800 text-lg truncate">
              {editing && editForm ? editForm.guest_name : booking.guest_name}
            </h2>
            <p className="text-xs text-slate-500">
              {(editing && editForm ? rooms.find(r => r.id === editForm.room_id)?.name : booking.room?.name) ?? 'Room'} · #{booking.id}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editing && !deleteMode && booking.status !== 'cancelled' && (
              <>
                <button
                  onClick={startEditing}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                  title="Edit booking"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteMode(true)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-red-600"
                  title="Delete booking"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-scroll px-6 pt-5 pb-28 space-y-5">
          {deleteMode ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Permanently delete this booking?</p>
                  <p className="text-sm text-slate-600 mt-2">
                    This will remove all records of {booking.guest_name}&apos;s booking in {booking.room?.name ?? 'this room'}{' '}
                    from {formatDate(booking.check_in, 'MMM d, yyyy')} to {formatDate(booking.check_out, 'MMM d, yyyy')} from the database entirely.
                  </p>
                  <p className="text-sm text-slate-600 mt-2">
                    This cannot be undone. It will not appear in reports or booking history.
                    Use &quot;Cancel Booking&quot; instead if the stay was real but the guest cancelled.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleDelete}
                  disabled={working}
                  className="flex-1 py-2.5 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {working ? 'Deleting…' : 'Delete permanently'}
                </button>
                <button
                  onClick={() => setDeleteMode(false)}
                  disabled={working}
                  className="flex-1 py-2.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Keep record
                </button>
              </div>
            </div>
          ) : editing && editForm ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={editForm.guest_name}
                  onChange={e => setEdit('guest_name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Room</label>
                <select
                  value={editForm.room_id}
                  onChange={e => setEdit('room_id', Number(e.target.value))}
                  className={inputClass}
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} — {r.room_type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Check-in</label>
                  <input
                    type="date"
                    value={editForm.check_in}
                    onChange={e => setEdit('check_in', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Check-out</label>
                  <input
                    type="date"
                    value={editForm.check_out}
                    onChange={e => setEdit('check_out', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nightly Rate (UGX)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.nightly_rate}
                    onChange={e => setEdit('nightly_rate', Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
                  <select
                    value={editForm.source}
                    onChange={e => setEdit('source', e.target.value)}
                    className={inputClass}
                  >
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEdit('notes', e.target.value)}
                  rows={3}
                  placeholder="Optional notes..."
                  className={`${inputClass} resize-none`}
                />
              </div>
              {editNights > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {editNights} night{editNights !== 1 ? 's' : ''} × {formatUGX(editForm.nightly_rate)}
                    </span>
                    <span className="font-semibold text-slate-800">{formatUGX(editTotal)}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Payment Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      disabled={working}
                      onClick={() => setEdit('payment_status', o.value)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all disabled:opacity-50 ${
                        editForm.payment_status === o.value
                          ? `border-transparent ${PAYMENT_COLORS[o.value].bg} ${PAYMENT_COLORS[o.value].text}`
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {editErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{editErr}</p>}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={working}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Cancel booking
                </button>
                <button
                  type="button"
                  onClick={handleExtend}
                  disabled={working || booking.status === 'cancelled'}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                >
                  Extend booking
                </button>
              </div>
              {extensionMode && (
                <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm text-slate-700">
                  Update the new check-out date and nightly rate for the extension, then click Save changes to record it.
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* FOOTER — fixed. In edit mode show discard/save; otherwise show booking totals only */}
        {!deleteMode && (
          <div className="sticky bottom-0 px-6 py-4 border-t border-slate-100 bg-slate-50">
            {editing ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={discardEdit}
                  disabled={working}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={working}
                  className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {working ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{nights} nights total</span>
                <span className="font-semibold text-slate-800">{formatUGX(total)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Add native confirm to deletion
