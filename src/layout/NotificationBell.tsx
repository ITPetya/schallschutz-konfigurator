import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listNotificationsFor, markAllReadFor, unreadCountFor } from "../notifications/mockNotificationStore";

// Jonas' Vorgabe 2026-07-23: "beim Anlegen eines Kontos sollen alle
// Verkaeufer eine Nachricht bekommen" - generisch fuer jeden eingeloggten
// Nutzer gebaut (nicht nur Verkaeufer-spezifisch), aktuell bekommen nur
// Verkaeufer je etwas geschickt (siehe mockAuthStore.register()).
export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [, forceRefresh] = useState(0);

  if (!user) return null;

  const notifications = listNotificationsFor(user.id);
  const unread = unreadCountFor(user.id);

  function toggle() {
    if (!open) markAllReadFor(user!.id);
    setOpen((v) => !v);
    forceRefresh((n) => n + 1);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Benachrichtigungen"
        className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 hover:border-brand hover:text-brand"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 max-h-96 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Benachrichtigungen</p>
            {notifications.length === 0 ? (
              <p className="text-slate-400">Keine Benachrichtigungen.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded border border-slate-100 bg-slate-50 p-2">
                    <p className="text-ink">{n.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("de-DE")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
