import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { Toast } from '../hooks/useToast';

interface Props {
  toasts: Toast[];
  remove: (id: number) => void;
}

const icons = {
  success: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
  error:   <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  info:    <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const borders = {
  success: 'border-green-200',
  error:   'border-red-200',
  info:    'border-blue-200',
};

export default function ToastContainer({ toasts, remove }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 bg-white rounded-lg border shadow-lg px-4 py-3 ${borders[t.type]} animate-fade-in`}
        >
          {icons[t.type]}
          <p className="text-sm text-slate-700 flex-1">{t.message}</p>
          <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600 transition-colors ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
