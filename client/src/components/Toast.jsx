import React from 'react';
import { useReservation } from '../context/ReservationContext.jsx';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function Toast() {
  const { toast } = useReservation();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-indigo-400 shrink-0" />
  };

  const borders = {
    success: 'border-emerald-500/40 bg-slate-900/95 text-emerald-100',
    warning: 'border-amber-500/40 bg-slate-900/95 text-amber-100',
    error: 'border-rose-500/40 bg-slate-900/95 text-rose-100',
    info: 'border-indigo-500/40 bg-slate-900/95 text-indigo-100'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
      <div className={`p-4 rounded-xl border shadow-2xl flex items-center gap-3 max-w-md ${borders[toast.type] || borders.info}`}>
        {icons[toast.type] || icons.info}
        <p className="text-xs font-medium leading-snug">{toast.message}</p>
      </div>
    </div>
  );
}

export default Toast;
