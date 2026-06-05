"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { LogOut, LayoutGrid, FileText, BarChart3, Settings, MapPin, ChevronLeft, ChevronRight, History, Archive } from "lucide-react";
import Link from "next/link";
import NotificationBell from "@/components/ui/NotificationBell";
import { ChevronDown } from "lucide-react";

function NavigationMenu({ isSidebarOpen, role }: { isSidebarOpen: boolean; role: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "";

  const menuItems = [
    {
      label: "Dashboard",
      icon: LayoutGrid,
      href: `/dashboard/${role.toLowerCase()}`,
      isActive: (role === "ADMIN" 
        ? (pathname === "/dashboard/admin" && (tab === "" || tab === "management"))
        : (pathname === "/dashboard/citizen" && (tab === "" || tab !== "analytics"))
      )
    },
    {
      label: "Reports",
      icon: FileText,
      href: `/dashboard/${role.toLowerCase()}/reports`,
      isActive: pathname === `/dashboard/${role.toLowerCase()}/reports`
    },
    {
      label: "Analytics",
      icon: BarChart3,
      href: role === "ADMIN" ? "/dashboard/admin?tab=analytics" : "/dashboard/citizen?tab=analytics",
      isActive: (role === "ADMIN"
        ? (pathname === "/dashboard/admin" && tab === "analytics")
        : (pathname === "/dashboard/citizen" && tab === "analytics")
      )
    },
    {
      label: "History",
      icon: History,
      href: `/dashboard/${role.toLowerCase()}/history`,
      isActive: pathname === `/dashboard/${role.toLowerCase()}/history`
    },
    ...(role === "ADMIN" ? [{
      label: "Archive",
      icon: Archive,
      href: "/dashboard/admin/archive",
      isActive: pathname === "/dashboard/admin/archive"
    }] : []),
    {
      label: "Map",
      icon: MapPin,
      href: role === "ADMIN" ? "/dashboard/admin/map" : "/dashboard/citizen/map",
      isActive: role === "ADMIN" ? pathname === "/dashboard/admin/map" : pathname === "/dashboard/citizen/map"
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
      isActive: pathname === "/dashboard/settings"
    }
  ];

  return (
    <nav className="flex-1 space-y-1.5 mt-4 shrink-0 px-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex transition-all duration-300 relative group
              ${isSidebarOpen
                ? "flex-row items-center gap-4 px-4 py-3 mx-2 my-0.5 rounded-xl text-sm font-medium"
                : "flex-col justify-center items-center py-2 px-1 mx-1 my-1 rounded-xl text-[10px] font-medium h-[62px] w-[64px] text-center"
              }
              ${active
                ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
              }
            `}
          >
            {/* Active left indicator line */}
            {active && (
              <div
                className={`absolute left-0 bg-blue-500 rounded-r-md transition-all duration-300
                  ${isSidebarOpen ? "top-3 bottom-3 w-1" : "top-2 bottom-2 w-1"}
                `}
              />
            )}

            <Icon
              className={`transition-transform duration-300 group-hover:scale-110 shrink-0
                ${isSidebarOpen ? "size-5" : "size-5 mb-1.5"}
                ${active ? "text-blue-500" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400"}
              `}
            />

            <span
              className={`whitespace-nowrap transition-all duration-350
                ${isSidebarOpen 
                  ? "opacity-100" 
                  : "opacity-100 text-[10px] leading-tight text-slate-450 dark:text-slate-450 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                }
                ${active && !isSidebarOpen ? "!text-blue-500 dark:!text-blue-400" : ""}
              `}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#020617]">
      {/* Sidebar */}
      <aside className={`glass-panel border-r border-slate-200 dark:border-slate-800 flex-col hidden md:flex transition-[width] duration-300 ease-in-out relative shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1.5 shadow-sm hover:shadow-md transition-all z-20 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          {isSidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        {/* Sidebar Content Wrapper with overflow-hidden to prevent toggle button clipping */}
        <div className="flex flex-col h-full overflow-hidden w-full">
          {/* Inner Content that remains fixed width to prevent text reflows */}
          <div className="flex flex-col h-full w-64 shrink-0">
            
            <div className="h-24 flex items-center relative shrink-0">
              <div className={`absolute left-0 w-20 flex justify-center items-center transition-all duration-300 ${isSidebarOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
                <div className="font-bold text-2xl bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">
                  CF
                </div>
              </div>
              <div className={`absolute left-0 pl-6 flex items-center transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                <div>
                  <div className="font-bold text-2xl bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">
                    CivicFlow
                  </div>
                  <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                    {session.user.role} PANEL
                  </div>
                </div>
              </div>
            </div>
            
            <Suspense fallback={<div className="flex-1 mt-4 px-4 space-y-3"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" /></div>}>
              <NavigationMenu isSidebarOpen={isSidebarOpen} role={session.user.role} />
            </Suspense>

            <div className="border-t border-slate-200 dark:border-slate-800 shrink-0 pb-4 pt-2">
              <div className="flex items-center h-16 w-full">
                <div className="w-20 flex justify-center items-center shrink-0">
                  <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shadow-sm">
                    {session.user.name?.[0] || "U"}
                  </div>
                </div>
                <div className={`overflow-hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="text-sm font-medium truncate w-[160px]">{session.user.name}</div>
                  <div className="text-xs text-slate-500 truncate w-[160px]">{session.user.email}</div>
                </div>
              </div>
              <div className="pr-4 mt-2">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center text-sm font-medium rounded-r-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group h-12"
                >
                  <div className="w-20 flex justify-center items-center shrink-0">
                    <LogOut className="size-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className={`transition-opacity duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                    Sign Out
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 glass-panel border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 relative">
          <div className="font-bold text-xl bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent md:hidden">
            CivicFlow
          </div>
          <div className="hidden md:block" /> {/* Spacer for desktop */}
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            
            {/* User Menu Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                  {session.user.name?.[0] || "U"}
                </div>
                <ChevronDown className="size-4 text-slate-500" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{session.user.name}</div>
                    <div className="text-xs text-slate-500 truncate">{session.user.email}</div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-8" onClick={() => setIsUserMenuOpen(false)}>
          {children}
        </div>
      </main>
    </div>
  );
}
