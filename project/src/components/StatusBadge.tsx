import type { RoomStatus } from '../lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/types';

interface Props {
  status: RoomStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const c = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
    } ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
