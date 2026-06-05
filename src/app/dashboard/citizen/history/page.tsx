"use client";

import { useState, useEffect } from "react";
import { Loader2, History as HistoryIcon, Clock, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { io } from "socket.io-client";

export default function CitizenHistoryPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
    const socket = io();
    socket.on("status-update", () => fetchComplaints());
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await fetch("/api/complaints");
      if (res.ok) {
        const data = await res.json();
        // Sort by newest first
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setComplaints(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RESOLVED": return <CheckCircle className="size-5 text-emerald-500" />;
      case "IN_PROGRESS": return <Clock className="size-5 text-amber-500" />;
      case "PENDING": return <AlertTriangle className="size-5 text-rose-500" />;
      default: return <FileText className="size-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
      case "IN_PROGRESS": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
      case "PENDING": return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800";
      default: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800";
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <HistoryIcon className="size-8 text-blue-500" />
            Report History
          </h1>
          <p className="text-slate-500 mt-2">Track the status of all your submitted reports over time.</p>
        </div>
      </div>

      {complaints.length === 0 ? (
        <div className="glass-panel p-10 text-center rounded-2xl text-slate-500">
          You haven't submitted any reports yet.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 md:ml-6 space-y-8 pb-8">
          {complaints.map((c: any) => (
            <div key={c.id} className="relative pl-8 md:pl-10 group">
              <div className="absolute -left-[17px] top-1 bg-white dark:bg-[#020617] rounded-full p-1 shadow-sm border border-slate-200 dark:border-slate-800 group-hover:scale-110 transition-transform">
                {getStatusIcon(c.status)}
              </div>
              
              <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 hover:shadow-md transition-shadow bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{c.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(c.status)}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full w-fit whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </div>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                  {c.description}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.category || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</div>
                    <div className={`text-sm font-bold ${
                      c.priority === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' :
                      c.priority === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                      c.priority === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {c.priority}
                    </div>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 md:col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location / Subdistrict</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.subdistrict || 'Unknown Location'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
