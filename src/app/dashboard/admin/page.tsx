"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Map from "@/components/Map";
import { Loader2, Users, AlertTriangle, CheckCircle, BarChart3, LayoutDashboard, Map as MapIcon, Search, SlidersHorizontal, RotateCcw, X, Sparkles, AlertCircle, Lightbulb, Target, Image as ImageIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import CustomSelect from "@/components/ui/CustomSelect";
import { useSearchParams, useRouter } from "next/navigation";

function AdminDashboardContent() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingPhotoUrl) {
        setViewingPhotoUrl(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPhotoUrl]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"analytics" | "management">("management");

  useEffect(() => {
    if (tabParam === "analytics" || tabParam === "management") {
      setActiveTab(tabParam);
    } else {
      setActiveTab("management");
    }
  }, [tabParam]);

  // Filters
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterSentiment, setFilterSentiment] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSubdistrict, setFilterSubdistrict] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [
    filterCategory !== "ALL",
    filterSentiment !== "ALL",
    filterStatus !== "ALL",
    filterSubdistrict !== "ALL",
    filterPriority !== "ALL"
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCategory("ALL");
    setFilterSentiment("ALL");
    setFilterStatus("ALL");
    setFilterSubdistrict("ALL");
    setFilterPriority("ALL");
    setSearchQuery("");
  };

  // Map Interaction State
  const [highlightedComplaintId, setHighlightedComplaintId] = useState<string | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [locatingId, setLocatingId] = useState<string | null>(null);

  const handleLocateOnMap = (id: string) => {
    if (highlightedComplaintId === id) {
      setHighlightedComplaintId(null);
      setSelectedComplaintId(null);
      return;
    }
    setHighlightedComplaintId(id);
    setSelectedComplaintId(null);
    setLocatingId(id);
    setTimeout(() => {
      setLocatingId(null);
    }, 1200); // matches the 1.2s flyTo speed in Map.tsx
  };

  // Scroll highlighted card into view when clicked on the map
  useEffect(() => {
    if (highlightedComplaintId) {
      const element = document.getElementById(`complaint-card-${highlightedComplaintId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [highlightedComplaintId]);

  useEffect(() => {
    fetchComplaints();

    const socket = io();
    socket.on("new-complaint", () => fetchComplaints());
    socket.on("status-update", () => fetchComplaints());

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      // Intentionally adding a slight delay to ensure skeleton loaders are visible and avoid jarring flashes
      const [res] = await Promise.all([
        fetch("/api/complaints"),
        new Promise(r => setTimeout(r, 800))
      ]);
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

  const updateStatus = async (id: string, status: string, rejectionReason?: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (res.ok) {
        fetchComplaints(); // Refresh data
        if (status === "REJECTED") {
          setRejectingId(null);
          setRejectReason("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const performDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchComplaints(); // Refresh data
        if (highlightedComplaintId === id) setHighlightedComplaintId(null);
        if (selectedComplaintId === id) setSelectedComplaintId(null);
      } else {
        alert("Failed to delete complaint");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  };

  const stats = {
    total: complaints.length,
    resolved: complaints.filter(c => c.status === "RESOLVED").length,
    critical: complaints.filter(c => c.priority === "CRITICAL").length,
    pending: complaints.filter(c => c.status === "PENDING").length,
  };

  const filteredComplaints = complaints.filter(c => {
    if (c.parentId) return false;
    // Hide Resolved/Rejected from default 'ALL' view to archive them
    if (filterStatus === "ALL" && (c.status === "RESOLVED" || c.status === "REJECTED")) return false;
    if (filterCategory !== "ALL" && c.category !== filterCategory) return false;
    if (filterSentiment !== "ALL" && c.sentiment?.toUpperCase() !== filterSentiment) return false;
    if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
    if (filterPriority !== "ALL" && c.priority !== filterPriority) return false;
    const sub = c.subdistrict || "Unknown";
    if (filterSubdistrict !== "ALL" && sub !== filterSubdistrict) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const titleMatch = c.title?.toLowerCase().includes(q);
      const descMatch = c.description?.toLowerCase().includes(q);
      const authorMatch = c.user?.name?.toLowerCase().includes(q);
      const subdistrictMatch = c.subdistrict?.toLowerCase().includes(q);
      const categoryMatch = c.category?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !authorMatch && !subdistrictMatch && !categoryMatch) return false;
    }
    return true;
  });

  // Extract unique categories and subdistricts for dropdowns
  const predefinedCategories = ["Infrastructure", "Environment", "Traffic", "Public Safety", "Other"];
  const uniqueCategories = Array.from(new Set([...predefinedCategories, ...complaints.map(c => c.category).filter(Boolean)]));
  const uniqueSubdistricts = Array.from(new Set(complaints.map(c => c.subdistrict || "Unknown").filter(Boolean)));

  if (loading) {
    return (
      <div className="w-full space-y-8 animate-fade-in-up p-2">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-3"></div>
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"></div>
          </div>
          <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl h-32 animate-pulse bg-slate-200/50 dark:bg-slate-800/50"></div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="glass-panel p-6 rounded-2xl h-[500px] animate-pulse bg-slate-200/50 dark:bg-slate-800/50"></div>
          <div className="glass-panel p-6 rounded-2xl h-[500px] animate-pulse bg-slate-200/50 dark:bg-slate-800/50"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 animate-fade-in-up min-h-0">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Control Center</h1>
          <p className="text-slate-500">Overview of all public complaints</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        {[
          { label: "Total Reports", value: stats.total, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Pending Review", value: stats.pending, icon: Users, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Critical Issues", value: stats.critical, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-all duration-300 border border-slate-200/30 dark:border-slate-800/30 hover:shadow-lg">
            <div className={`size-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="size-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{loading ? <Loader2 className="animate-spin size-5 mt-1" /> : stat.value}</div>
              <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {activeTab === "analytics" ? (
        <AnalyticsDashboard complaints={complaints} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <div className="flex flex-col space-y-4 h-full min-h-0">
            {/* Recent Reports Grid */}
            {complaints.length > 0 && !selectedComplaintId && (
              <div className="space-y-3 mb-2 w-full shrink-0">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recent Reports</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  {complaints.slice(0, 3).map((c: any) => {
                    const isNew = new Date().getTime() - new Date(c.createdAt).getTime() < 24 * 60 * 60 * 1000;
                    const priorityColor =
                      c.priority === 'CRITICAL' ? '#ef4444' :
                        c.priority === 'HIGH' ? '#f97316' :
                          c.priority === 'MEDIUM' ? '#eab308' :
                            '#3b82f6';
                    return (
                      <div
                        key={`recent-${c.id}`}
                        className={`p-4 rounded-xl glass-panel border transition-all duration-300 flex flex-col justify-between h-36 relative group cursor-pointer ${highlightedComplaintId === c.id
                          ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/25'
                          : 'border-slate-200/40 dark:border-slate-800/40 hover:border-blue-500/40'
                          }`}
                        onClick={() => handleLocateOnMap(c.id)}
                      >
                        {isNew && (
                          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/20 animate-pulse z-10">
                            NEW
                          </span>
                        )}
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-500 transition-colors">{c.title}</h4>
                            <span
                              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase shrink-0"
                              style={{
                                backgroundColor: `${priorityColor}15`,
                                color: priorityColor,
                                borderColor: `${priorityColor}30`
                              }}
                            >
                              {c.priority}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{c.description}</p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[170px]">
                            📍 {c.subdistrict || "Unknown"}
                          </span>
                          <span className="text-[10px] font-bold text-blue-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Locate &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 shrink-0 relative z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {selectedComplaintId ? "Pinned Complaint" : "All Complaints"}
                </h2>
                {selectedComplaintId ? (
                  <button
                    onClick={() => {
                      setSelectedComplaintId(null);
                      setHighlightedComplaintId(null);
                    }}
                    className="text-xs font-bold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/25 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Show All ({filteredComplaints.length})
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100/80 dark:bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                    Showing {filteredComplaints.length} of {complaints.length}
                  </span>
                )}
              </div>

              {/* Unified Controls Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="size-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by title, description, citizen, category or subdistrict..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/80 rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-slate-750 dark:hover:text-slate-200 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all duration-300 btn-bouncy ${showFilters || activeFiltersCount > 0
                      ? 'bg-blue-500 border-blue-400 text-white dark:bg-blue-600 dark:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                      : 'bg-white/50 border-slate-200 text-slate-650 hover:bg-slate-100/85 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800/80'
                      }`}
                  >
                    <SlidersHorizontal className="size-4" />
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400 size-5 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold border border-red-200/40 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-450 dark:hover:bg-red-600 dark:hover:text-white transition-all duration-200"
                      title="Reset all filters"
                    >
                      <RotateCcw className="size-4" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Filters Container */}
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300 origin-top ${showFilters
                  ? "opacity-100 max-h-[500px] translate-y-0 overflow-visible"
                  : "opacity-0 max-h-0 -translate-y-2 pointer-events-none p-0 border-0 overflow-hidden"
                  }`}
              >
                <div className="flex flex-col relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-1.5 ml-1">Status</span>
                  <CustomSelect
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[
                      { value: "ALL", label: "All Status" },
                      { value: "PENDING", label: "Pending" },
                      { value: "IN_PROGRESS", label: "In Progress" },
                      { value: "RESOLVED", label: "Resolved" },
                      { value: "REJECTED", label: "Rejected" }
                    ]}
                  />
                </div>
                <div className="flex flex-col relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-1.5 ml-1">Priority</span>
                  <CustomSelect
                    value={filterPriority}
                    onChange={setFilterPriority}
                    options={[
                      { value: "ALL", label: "All Priorities" },
                      { value: "LOW", label: "Low" },
                      { value: "MEDIUM", label: "Medium" },
                      { value: "HIGH", label: "High" },
                      { value: "CRITICAL", label: "Critical" }
                    ]}
                  />
                </div>
                <div className="flex flex-col relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-1.5 ml-1">Sentiment</span>
                  <CustomSelect
                    value={filterSentiment}
                    onChange={setFilterSentiment}
                    options={[
                      { value: "ALL", label: "All Sentiments" },
                      { value: "POSITIVE", label: "Positive" },
                      { value: "NEUTRAL", label: "Neutral" },
                      { value: "NEGATIVE", label: "Negative" }
                    ]}
                  />
                </div>
                <div className="flex flex-col relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-1.5 ml-1">Category</span>
                  <CustomSelect
                    value={filterCategory}
                    onChange={setFilterCategory}
                    options={[
                      { value: "ALL", label: "All Categories" },
                      ...(uniqueCategories as string[]).map(cat => ({ value: cat, label: cat }))
                    ]}
                  />
                </div>
                <div className="flex flex-col col-span-2 sm:col-span-1 relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-1.5 ml-1">Subdistrict</span>
                  <CustomSelect
                    value={filterSubdistrict}
                    onChange={setFilterSubdistrict}
                    options={[
                      { value: "ALL", label: "All Subdistricts" },
                      ...(uniqueSubdistricts as string[]).map(sub => ({ value: sub, label: sub }))
                    ]}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center glass-panel rounded-2xl"><Loader2 className="size-6 animate-spin text-blue-500" /></div>
            ) : (selectedComplaintId ? complaints.filter(c => c.id === selectedComplaintId) : filteredComplaints).length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-2xl text-slate-500">No complaints match the filters.</div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-0">
                {(selectedComplaintId ? complaints.filter(c => c.id === selectedComplaintId) : filteredComplaints).map((c: any, index: number) => {
                  const priorityColor =
                    c.priority === 'CRITICAL' ? '#ef4444' :
                      c.priority === 'HIGH' ? '#f97316' :
                        c.priority === 'MEDIUM' ? '#eab308' :
                          '#3b82f6';

                  const s = c.sentiment?.toUpperCase() || 'NEUTRAL';
                  const sentimentInfo = s === 'POSITIVE'
                    ? { text: 'Positive', emoji: '✨', styles: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
                    : s === 'NEGATIVE'
                      ? { text: 'Negative', emoji: '⚠️', styles: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' }
                      : s === 'FRUSTRATED'
                        ? { text: 'Frustrated', emoji: '💢', styles: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' }
                        : s === 'PANICKED'
                          ? { text: 'Panicked', emoji: '🚨', styles: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-bold' }
                          : s === 'CONSTRUCTIVE'
                            ? { text: 'Constructive', emoji: '💡', styles: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
                            : { text: 'Neutral', emoji: '💬', styles: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };

                  return (
                    <div
                      key={c.id}
                      id={`complaint-card-${c.id}`}
                      className={`premium-card p-6 rounded-2xl flex flex-col md:flex-row gap-6 border transition-all duration-300 relative ${highlightedComplaintId === c.id ? 'shadow-xl ring-1 ring-blue-500/30 dark:ring-blue-400/30 bg-slate-900/15 dark:bg-slate-950/30' : 'hover:shadow-lg'
                        }`}
                      style={{
                        boxShadow: highlightedComplaintId === c.id
                          ? `0 0 25px -5px ${priorityColor}35, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
                          : '0 4px 20px -2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        zIndex: filteredComplaints.length - index
                      }}
                    >
                      {/* Left glowing vertical priority line inside the card */}
                      <div
                        className="w-1 rounded-full self-stretch shrink-0 hidden md:block"
                        style={{
                          backgroundColor: priorityColor,
                          boxShadow: `0 0 12px ${priorityColor}bb`
                        }}
                      />

                      <div className="flex-1 flex flex-col">
                        <div className="flex flex-wrap items-center gap-3 mb-2.5">
                          <h3 className="font-extrabold text-xl text-slate-800 dark:text-slate-100 tracking-tight">{c.title}</h3>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border border-slate-200/50 dark:border-slate-700/50">
                            By: {c.duplicateCount > 0 ? `${c.duplicateCount + 1} Citizens` : (c.user?.name || "Unknown")}
                          </span>
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1">
                            {c.duplicateCount > 0 ? '🕒 First Report Date:' : '🕒 Report Date:'} {new Date(c.createdAt).toLocaleDateString("en-US", {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {c.duplicateCount > 0 && (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30 flex items-center gap-1 shadow-sm animate-pulse">
                              🔥 {c.duplicateCount + 1} Reports Clustered
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-1 leading-relaxed">{c.description}</p>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                          {c.duplicateCount > 0 ? '📅 First Incident Date:' : '📅 Incident Date & Time:'} {c.incidentDate ? new Date(c.incidentDate).toLocaleDateString("en-US", {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : new Date(c.createdAt).toLocaleDateString("en-US", {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold mb-4 mt-auto">
                          <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5 hover:scale-[1.03] transition-transform duration-200">
                            📁 {c.category || 'Uncategorized'}
                          </span>
                          <span className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 hover:scale-[1.03] transition-transform duration-200 ${sentimentInfo.styles}`}>
                            {sentimentInfo.emoji} {sentimentInfo.text}
                          </span>
                          <span className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5 hover:scale-[1.03] transition-transform duration-200">
                            📍 {c.subdistrict || 'Unknown'}
                          </span>
                        </div>
                        {c.aiSummary && (
                          <div className="mb-3 bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-900/10 rounded-lg text-xs border border-indigo-100/60 dark:border-indigo-800/40 overflow-hidden shadow-sm">
                            <div className="bg-indigo-100/50 dark:bg-indigo-900/30 px-3 py-1.5 flex items-center gap-1.5 border-b border-indigo-100/60 dark:border-indigo-800/40">
                              <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                              <strong className="text-indigo-700 dark:text-indigo-300 font-semibold tracking-wide uppercase">AI Insights</strong>
                            </div>
                            <div className="px-3 py-2 space-y-2">
                              <div className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                {c.duplicateCount > 0 && (
                                  <div className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-1.5 rounded border border-rose-100 dark:border-rose-800/30 flex items-start gap-1.5 mb-1.5">
                                    <span className="text-sm leading-none mt-px">🔥</span>
                                    <span>Critical Insight: {c.duplicateCount + 1} citizens have independently reported this exact same issue, indicating a severe and widespread community impact.</span>
                                  </div>
                                )}
                                <p>{c.aiSummary}</p>
                              </div>
                              
                              {(c.aiKeyIssues || c.aiRecommendedAction) && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-indigo-100/50 dark:border-indigo-800/30">
                                  {c.aiKeyIssues && (
                                    <div className="flex items-center gap-1.5">
                                      <Target className="size-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                      <div className="flex flex-wrap gap-1">
                                        {c.aiKeyIssues.split(',').map((issue: string, i: number) => (
                                          <span key={i} className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50">
                                            {issue.trim()}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {c.aiRecommendedAction && (
                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50/50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100/50 dark:border-emerald-800/30 flex-1">
                                      <Lightbulb className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span>{c.aiRecommendedAction}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {c.aiUrgencyReason && (
                                <div className="flex items-start gap-1.5 bg-amber-50/70 dark:bg-amber-900/10 px-2 py-1.5 rounded border border-amber-200/50 dark:border-amber-800/30">
                                  <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                  <p className="text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                                    <span className="font-bold mr-1">Urgency Justification:</span>
                                    {c.aiUrgencyReason}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </div>

                      <div className="flex flex-col gap-3 w-full sm:w-48 shrink-0 justify-start pt-4 md:pt-0 mt-4 md:mt-0 md:pl-6 md:border-l border-slate-100 dark:border-slate-800/60 border-t md:border-t-0">
                        <div className="space-y-1.5 relative">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80">Action</label>
                          <CustomSelect
                            value={c.status}
                            onChange={(val) => {
                              if (val === "REJECTED") {
                                setRejectingId(c.id);
                                setRejectReason("");
                              } else {
                                updateStatus(c.id, val);
                              }
                            }}
                            options={[
                              { value: "PENDING", label: "Pending", colorClass: "bg-rose-50/80 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold" },
                              { value: "IN_PROGRESS", label: "In Progress", colorClass: "bg-amber-50/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold" },
                              { value: "RESOLVED", label: "Resolved", colorClass: "bg-emerald-50/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold" },
                              { value: "REJECTED", label: "Rejected", colorClass: "bg-slate-200/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold" }
                            ]}
                            className={`!border transition-all duration-300 ${c.status === 'PENDING' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.08)]' :
                              c.status === 'IN_PROGRESS' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.08)]' :
                                c.status === 'RESOLVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.08)]' :
                                  c.status === 'REJECTED' ? 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 shadow-none' :
                                    'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 shadow-none'
                              }`}
                          />
                        </div>

                        <button
                          onClick={() => handleLocateOnMap(c.id)}
                          className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all duration-300 btn-bouncy ${highlightedComplaintId === c.id
                            ? 'bg-blue-500 border-blue-400 text-white dark:bg-blue-600 dark:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                            : 'bg-white/50 border-slate-200 text-slate-600 hover:bg-blue-500 hover:text-white dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-blue-600 dark:hover:text-white'
                            }`}
                        >
                          <MapIcon className={`size-4 ${locatingId === c.id ? 'animate-bounce' : ''}`} />
                          {locatingId === c.id ? "Locating..." : highlightedComplaintId === c.id ? "Pinned on Map" : "Find on Map"}
                        </button>
                        
                        {c.imageUrl && (
                          <button
                            onClick={() => setViewingPhotoUrl(c.imageUrl)}
                            className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-semibold border border-purple-200/50 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:text-purple-300 transition-all duration-300 btn-bouncy"
                          >
                            <ImageIcon className="size-4" />
                            View Photo
                          </button>
                        )}

                        <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border transition-all duration-300 ${c.priority === 'CRITICAL' ? 'border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]' :
                          c.priority === 'HIGH' ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
                            c.priority === 'MEDIUM' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]' :
                              'border-blue-500/30 bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                          }`}>
                          <span className={`size-1.5 rounded-full ${c.priority === 'CRITICAL' ? 'bg-rose-500 animate-pulse' :
                            c.priority === 'HIGH' ? 'bg-amber-500' :
                              c.priority === 'MEDIUM' ? 'bg-yellow-500' :
                                'bg-blue-500'
                            }`} />
                          {c.priority} Priority
                        </div>

                        {(c.suggestDelete || c.category === 'Unknown') && (
                          <button
                            onClick={() => confirmDelete(c.id)}
                            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all duration-300 shadow-sm mt-1"
                          >
                            Delete Complaint
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-full flex flex-col min-h-0">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100 shrink-0">Live City Map</h2>
            <div className="flex-1 min-h-0">
              <Map 
                complaints={filteredComplaints} 
                interactive={false} 
                highlightedComplaintId={highlightedComplaintId} 
                onMarkerClick={(id) => {
                  setHighlightedComplaintId(id);
                  setSelectedComplaintId(id);
                }}
                onMapClick={() => {
                  setHighlightedComplaintId(null);
                  setSelectedComplaintId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
             <div className="p-6 pb-8">
               <div className="size-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle className="size-8" />
               </div>
               <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">Delete Invalid Complaint?</h3>
               <p className="text-slate-500 text-sm mb-6">
                 This complaint will be permanently deleted from the system. You cannot undo this action.
               </p>
               <div className="flex gap-3 w-full">
                 <button onClick={cancelDelete} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors">
                   Cancel
                 </button>
                 <button onClick={() => performDelete(deletingId)} className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition-colors flex justify-center items-center gap-2">
                   Delete
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
             <div className="p-6 pb-8">
               <div className="size-16 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle className="size-8" />
               </div>
               <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">Reject Complaint</h3>
               <p className="text-slate-500 text-sm mb-4">
                 Please provide a reason for rejecting this complaint. This will be shown to the citizen.
               </p>
               <textarea
                 value={rejectReason}
                 onChange={(e) => setRejectReason(e.target.value)}
                 className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 h-24 focus:ring-2 focus:ring-blue-500 outline-none mb-6 text-left"
                 placeholder="Reason for rejection..."
               />
               <div className="flex gap-3 w-full">
                 <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors">
                   Cancel
                 </button>
                 <button 
                   onClick={() => updateStatus(rejectingId, "REJECTED", rejectReason)} 
                   disabled={!rejectReason.trim()}
                   className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50 rounded-xl font-semibold transition-colors flex justify-center items-center gap-2">
                   Reject Report
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
      
      {/* Photo Viewing Modal */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingPhotoUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all"
            >
              <X className="size-6" />
            </button>
            <img 
              src={viewingPhotoUrl} 
              alt="Complaint Evidence" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10" 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin size-8 text-blue-500" />
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
