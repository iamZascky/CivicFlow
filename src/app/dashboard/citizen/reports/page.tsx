"use client";

import { useState, useEffect } from "react";
import { Loader2, FileText, Download, Printer, Filter, Calendar, BarChart3, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import { io } from "socket.io-client";

export default function CitizenReportsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

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
        setComplaints(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uniqueCategories = Array.from(new Set(complaints.map(c => c.category).filter(Boolean)));

  // Filtering logic
  const filteredComplaints = complaints.filter(c => {
    if (filterCategory !== "ALL" && c.category !== filterCategory) return false;
    if (filterPriority !== "ALL" && c.priority !== filterPriority) return false;
    if (filterStatus !== "ALL" && c.status !== filterStatus) return false;

    if (startDate) {
      const start = new Date(startDate);
      const created = new Date(c.createdAt);
      if (created < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const created = new Date(c.createdAt);
      if (created > end) return false;
    }

    return true;
  });

  // Calculate statistics
  const stats = {
    total: filteredComplaints.length,
    pending: filteredComplaints.filter(c => c.status === "PENDING").length,
    inProgress: filteredComplaints.filter(c => c.status === "IN_PROGRESS").length,
    resolved: filteredComplaints.filter(c => c.status === "RESOLVED").length,
    critical: filteredComplaints.filter(c => c.priority === "CRITICAL").length,
  };

  const resolvedRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  // Export CSV
  const handleExportCSV = () => {
    if (filteredComplaints.length === 0) return;

    const headers = ["ID", "Title", "Description", "Category", "Priority", "Status", "Subdistrict", "Created At"];
    const rows = filteredComplaints.map(c => [
      c.id,
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${(c.description || "").replace(/"/g, '""')}"`,
      c.category || "Uncategorized",
      c.priority || "MEDIUM",
      c.status || "PENDING",
      c.subdistrict || "Unknown",
      new Date(c.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `my_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* Header section (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="size-8 text-blue-500" />
            My Reports Archive
          </h1>
          <p className="text-slate-500">Filter, print, and export your personal complaints reports history.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredComplaints.length === 0}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="size-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={filteredComplaints.length === 0}
            className="flex items-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all btn-bouncy cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="size-4" />
            <span>Print List</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 uppercase">CivicFlow Personal Activity Report</h1>
            <p className="text-slate-600 text-sm mt-1">Personal submitted complaints and resolution records</p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            Date Generated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Controls / Filters Panel (Hidden when printing) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/30 dark:border-slate-800/30 space-y-4 print:hidden">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2">
          <Filter className="size-4" />
          Report Filter Parameters
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5 ml-1">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5 ml-1">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5 ml-1">Category</span>
            <CustomSelect
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { value: "ALL", label: "All Categories" },
                ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
              ]}
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5 ml-1">Priority</span>
            <CustomSelect
              value={filterPriority}
              onChange={setFilterPriority}
              options={[
                { value: "ALL", label: "All Priorities" },
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "CRITICAL", label: "Critical" },
              ]}
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-1.5 ml-1">Status</span>
            <CustomSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: "ALL", label: "All Status" },
                { value: "PENDING", label: "Pending" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "RESOLVED", label: "Resolved" },
                { value: "REJECTED", label: "Rejected" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Reports Summary Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-4 print:mb-6">
        {[
          { label: "Reports Generated", value: stats.total, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Resolution Rate", value: `${resolvedRate}%`, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Critical Priority", value: stats.critical, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl flex items-center gap-4 border border-slate-200/30 dark:border-slate-800/30 print:border-slate-300 print:bg-white print:shadow-none print:p-4">
            <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 print:hidden ${stat.bg} ${stat.color}`}>
              <stat.icon className="size-5.5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 print:text-black">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium print:text-slate-650">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Reports Table Preview */}
      <div className="glass-panel rounded-2xl border border-slate-200/30 dark:border-slate-800/30 overflow-hidden print:border-slate-300 print:bg-white print:shadow-none">
        <div className="p-5 border-b border-slate-200/40 dark:border-slate-800/50 flex justify-between items-center print:hidden">
          <h3 className="font-bold text-base">Personal Reports List</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100/80 dark:bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
            {filteredComplaints.length} Submissions
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredComplaints.length === 0 ? (
            <div className="p-10 text-center text-slate-500">You have no complaints matching your query.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border-b border-slate-200/40 dark:border-slate-800/50 print:bg-slate-200 print:text-black">
                  <th className="p-3 font-semibold print:py-2">Date</th>
                  <th className="p-3 font-semibold print:py-2">Title</th>
                  <th className="p-3 font-semibold print:py-2">Category</th>
                  <th className="p-3 font-semibold print:py-2">Subdistrict</th>
                  <th className="p-3 font-semibold print:py-2 text-center">Priority</th>
                  <th className="p-3 font-semibold print:py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 print:divide-slate-300">
                {filteredComplaints.map((c) => {
                  const priorityColor =
                    c.priority === 'CRITICAL' ? 'text-red-600 bg-red-500/10' :
                    c.priority === 'HIGH' ? 'text-orange-600 bg-orange-500/10' :
                    c.priority === 'MEDIUM' ? 'text-yellow-600 bg-yellow-500/10' :
                    'text-blue-600 bg-blue-500/10';

                  const statusColor =
                    c.status === 'RESOLVED' ? 'text-emerald-600 bg-emerald-500/10' :
                    c.status === 'IN_PROGRESS' ? 'text-amber-600 bg-amber-500/10' :
                    c.status === 'REJECTED' ? 'text-slate-600 bg-slate-500/10' :
                    'text-rose-600 bg-rose-500/10';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 print:hover:bg-transparent">
                      <td className="p-3 whitespace-nowrap text-slate-500 dark:text-slate-400 print:py-2 print:text-black">
                        {new Date(c.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200 print:py-2 print:text-black">
                        {c.title}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 print:py-2 print:text-black">
                        {c.category || "Uncategorized"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 print:py-2 print:text-black">
                        {c.subdistrict || "Unknown"}
                      </td>
                      <td className="p-3 text-center print:py-2 print:text-black">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase print:bg-transparent print:border print:px-1.5 ${priorityColor}`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="p-3 text-center print:py-2 print:text-black">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase print:bg-transparent print:border print:px-1.5 ${statusColor}`}>
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
