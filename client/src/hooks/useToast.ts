import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: string; type: ToastType; message: string; }

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (m: string) => add('success', m),
    error: (m: string) => add('error', m),
    info: (m: string) => add('info', m),
    warning: (m: string) => add('warning', m),
  };

  return { toasts, toast, remove };
}
