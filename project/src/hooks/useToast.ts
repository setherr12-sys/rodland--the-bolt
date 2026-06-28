import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let _id = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++_id;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, 3500);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return { toasts, add, remove };
}
