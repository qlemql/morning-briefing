'use client';

import { useState, useEffect, useCallback } from 'react';

interface ToastMessage {
  id: string;
  text: string;
  icon?: string;
}

let addToastFn: ((text: string, icon?: string) => void) | null = null;

/** Global toast trigger — call from anywhere */
export function showToast(text: string, icon?: string) {
  addToastFn?.(text, icon);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, icon?: string) => {
    const id = Math.random().toString(36).slice(2, 8);
    setToasts((prev) => [...prev.slice(-2), { id, text, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-[fadeSlideUp_0.25s_ease-out]"
        >
          {t.icon && <span className="mr-1.5">{t.icon}</span>}
          {t.text}
        </div>
      ))}
    </div>
  );
}
