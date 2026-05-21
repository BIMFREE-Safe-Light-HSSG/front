"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Flame, X } from "lucide-react";

import {
  getFireNotificationUnreadCount,
  listFireNotifications,
  markFireNotificationRead,
  type FireNotification,
} from "@/app/api/fire-incidents";
import { formatViewerDateTime } from "@/lib/format/datetime";
import { cn } from "@/lib/utils";

type EmergencyFireNotificationsProps = {
  onSelectBuilding: (buildingId: string) => void;
};

export function EmergencyFireNotifications({
  onSelectBuilding,
}: EmergencyFireNotificationsProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<FireNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const [count, items] = await Promise.all([
        getFireNotificationUnreadCount(token),
        listFireNotifications(token, false),
      ]);
      setUnreadCount(count);
      setNotifications(items);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    await refresh();
    setLoading(false);
  };

  const handleSelect = async (notification: FireNotification) => {
    const token = localStorage.getItem("accessToken");
    if (token && !notification.read_at) {
      try {
        await markFireNotificationRead(token, notification.id);
      } catch {
        /* continue navigation */
      }
    }
    onSelectBuilding(notification.building_id);
    setOpen(false);
    void refresh();
  };

  return (
    <div className="relative px-4">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : void handleOpen())}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
          unreadCount > 0
            ? "border-red-500/40 bg-red-50/80 shadow-sm shadow-red-500/10"
            : "border-red-900/15 bg-white/40",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-red-900">
          <Bell className={cn("h-4 w-4", unreadCount > 0 && "animate-pulse")} />
          화재 알림
          {unreadCount > 0 ? (
            <span className="rounded-full bg-red-600 px-2 py-0.5 font-mono text-[10px] text-white">
              {unreadCount}
            </span>
          ) : null}
        </span>
        <Flame className="h-4 w-4 text-red-600/70" />
      </button>

      {open ? (
        <div className="absolute left-4 right-4 top-full z-30 mt-2 max-h-72 overflow-hidden rounded-2xl border border-red-900/15 bg-white/95 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-red-900/10 px-4 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">최근 알림</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-zinc-500 hover:bg-red-50"
              aria-label="알림 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto p-2">
            {loading ? (
              <li className="px-3 py-6 text-center text-xs text-zinc-500">불러오는 중…</li>
            ) : notifications.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-zinc-500">알림이 없습니다.</li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(notification)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                      notification.read_at
                        ? "hover:bg-zinc-50"
                        : "bg-red-50/70 hover:bg-red-100/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-red-900">{notification.title}</p>
                      {!notification.read_at ? (
                        <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 font-mono text-[9px] text-white">
                          NEW
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{notification.body}</p>
                    <time className="mt-1 block font-mono text-[10px] text-zinc-400">
                      {formatViewerDateTime(notification.created_at)}
                    </time>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
