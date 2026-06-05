"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const controller = new AbortController();

    const fetchWithSignal = async () => {
      try {
        const res = await fetch("/api/notifications", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          console.error("Failed to fetch notifications:", e);
        }
      }
    };

    fetchWithSignal();
    const interval = setInterval(fetchWithSignal, 30000); // Poll every 30s
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string, link?: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setIsOpen(false);
      if (link) {
        router.push(link);
      }
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 size-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#020617]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 origin-top-right animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="size-3" />
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id, notification.link)}
                  className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !notification.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {!notification.isRead ? (
                        <div className="size-2 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      ) : (
                        <Check className="size-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-sm font-semibold mb-1 ${!notification.isRead ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}>
                        {notification.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
