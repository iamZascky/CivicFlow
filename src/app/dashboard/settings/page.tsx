"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { User, Mail, Shield, Bell, Moon, Sun, Lock, Check } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [realtimeAlerts, setRealtimeAlerts] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme === 'dark' || (!storedTheme && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    setEmailNotifications(localStorage.getItem('emailNotifications') !== 'false');
    setRealtimeAlerts(localStorage.getItem('realtimeAlerts') !== 'false');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (newTheme) html.classList.add('dark');
      else html.classList.remove('dark');
    }
  };

  const handleEmailToggle = () => {
    const newVal = !emailNotifications;
    setEmailNotifications(newVal);
    localStorage.setItem('emailNotifications', newVal ? 'true' : 'false');
  };

  const handleRealtimeToggle = () => {
    const newVal = !realtimeAlerts;
    setRealtimeAlerts(newVal);
    localStorage.setItem('realtimeAlerts', newVal ? 'true' : 'false');
  };

  if (!session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Account Settings</h1>
        <p className="text-slate-500">Manage your profile, alerts, and preferences</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Card: Profile Overview */}
        <div className="md:col-span-1 glass-panel p-6 rounded-2xl border border-slate-200/30 dark:border-slate-800/30 flex flex-col items-center text-center">
          <div className="size-20 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-3xl shadow-md mb-4 border border-blue-200/20">
            {session.user.name?.[0] || "U"}
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{session.user.name}</h2>
          <p className="text-sm text-slate-500 mb-4">{session.user.email}</p>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
            <Shield className="size-3" />
            {session.user.role}
          </div>

          <div className="w-full border-t border-slate-200/50 dark:border-slate-800/50 my-6"></div>

          <div className="w-full text-left space-y-3.5">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <User className="size-4 shrink-0 text-slate-450" />
              <span className="truncate">{session.user.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Mail className="size-4 shrink-0 text-slate-450" />
              <span className="truncate">{session.user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Shield className="size-4 shrink-0 text-slate-450" />
              <span>Role: {session.user.role} Privilege</span>
            </div>
          </div>
        </div>

        {/* Right Columns: Forms and Preferences */}
        <div className="md:col-span-2 space-y-6">
          
          {/* General Preference Settings */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Bell className="size-5 text-blue-500" />
              Application Preferences
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Theme Mode</div>
                  <div className="text-xs text-slate-500">Toggle light or dark visual interface</div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isDarkMode ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-blue-500" />}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Email Notifications</div>
                  <div className="text-xs text-slate-500">Receive summaries and updates on reported issues</div>
                </div>
                <button
                  onClick={handleEmailToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    emailNotifications ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      emailNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Real-time Dashboard Alerts</div>
                  <div className="text-xs text-slate-500">Enable real-time push alerts and sound signals for modifications</div>
                </div>
                <button
                  onClick={handleRealtimeToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    realtimeAlerts ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      realtimeAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Panel */}
          <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl border border-slate-200/30 dark:border-slate-800/30 space-y-4">
            <h3 className="text-lg font-bold mb-1.5 flex items-center gap-2">
              <Lock className="size-5 text-blue-500" />
              Security Settings
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-sm placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-sm placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <p className="text-xs text-slate-500">Security policies enforce a minimum length of 8 characters.</p>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all btn-bouncy"
              >
                {isSaved ? (
                  <>
                    <Check className="size-4" />
                    Saved!
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
