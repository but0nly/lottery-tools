"use client";

import React, { useEffect, useState } from 'react';
import { toast, NotificationItem, ConfirmOptions } from '@/lib/notification';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    const unsubNotify = toast.subscribe(setNotifications);
    const unsubConfirm = toast.subscribeConfirm(setConfirmOptions);
    return () => {
      unsubNotify();
      unsubConfirm();
    };
  }, []);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-rose-50 border-rose-100',
    warning: 'bg-amber-50 border-amber-100',
    info: 'bg-blue-50 border-blue-100',
  };

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-20 md:top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
        {notifications.map((n) => (
          <div 
            key={n.id}
            className={`flex items-center gap-3 p-4 rounded-2xl border shadow-lg animate-in slide-in-from-top-4 fade-in duration-300 ${bgColors[n.type as keyof typeof bgColors]}`}
          >
            {icons[n.type as keyof typeof icons]}
            <p className="text-sm font-medium text-slate-800 flex-1">{n.message}</p>
            <button onClick={() => toast.remove(n.id)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmOptions && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmOptions.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{confirmOptions.message}</p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => {
                  if (confirmOptions.onCancel) confirmOptions.onCancel();
                  toast.closeConfirm();
                }}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <div className="w-px bg-slate-100"></div>
              <button 
                onClick={() => {
                  confirmOptions.onConfirm();
                  toast.closeConfirm();
                }}
                className="flex-1 py-4 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
