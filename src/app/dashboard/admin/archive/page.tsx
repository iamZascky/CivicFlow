"use client";

import { useState, useEffect } from "react";
import { Loader2, Archive, RotateCcw, Trash2, CheckSquare, Square } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminArchivePage() {
  const { data: session, status } = useSession();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || (session && session.user.role !== "ADMIN")) {
      router.push("/auth/login");
    }
  }, [status, session, router]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/complaints");
      if (res.ok) {
        const data = await res.json();
        // Filter only ARCHIVED complaints, and only master complaints
        setComplaints(data.filter((c: any) => 
          !c.parentId && c.status === "ARCHIVED"
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleRetrieve = async (id: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      });
      if (res.ok) {
        fetchComplaints(); // Refresh data
      }
    } catch (e) {
      console.error(e);
      alert("Failed to retrieve complaint");
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === complaints.length && complaints.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(complaints.map(c => c.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await fetch("/api/complaints", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchComplaints();
        setIsDeleteDialogOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete complaints");
    }
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const allSelected = complaints.length > 0 && selectedIds.size === complaints.length;

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Archive className="size-8 text-emerald-500" />
            Archive
          </h1>
          <p className="text-slate-500 mt-1">Permanently archived reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all border ${
              selectedIds.size > 0 
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 dark:border-red-800/50 cursor-pointer' 
                : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed'
            }`}
            title="Delete Selected"
          >
            <Trash2 className="size-4" />
            Delete Selected
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button onClick={handleSelectAll} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
          {allSelected ? <CheckSquare className="size-5 text-emerald-500" /> : <Square className="size-5" />}
          <span className="text-sm font-medium">{allSelected ? "Deselect All" : "Select All"}</span>
        </button>
        {selectedIds.size > 0 && (
          <span className="text-sm font-medium text-slate-500 ml-4">
            {selectedIds.size} selected
          </span>
        )}
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {complaints.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl text-slate-500">
            No archived complaints found.
          </div>
        ) : (
          complaints.map((c: any) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`glass-panel p-4 md:p-6 rounded-2xl flex flex-col md:flex-row gap-4 border transition-all ${
                  isSelected 
                    ? 'border-emerald-400 shadow-md bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-500/50' 
                    : 'border-slate-200/50 dark:border-slate-800/50 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button onClick={() => handleSelect(c.id)} className="mt-1 shrink-0 text-slate-400 hover:text-emerald-500 transition-colors">
                    {isSelected ? <CheckSquare className="size-5 text-emerald-500" /> : <Square className="size-5" />}
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{c.title}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
                      {c.status}
                    </span>
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                    {c.description}
                  </p>
                  
                  <div className="text-[11px] text-slate-500 font-medium mt-auto flex flex-wrap gap-4">
                    <span>By: {c.duplicateCount > 0 ? `${c.duplicateCount + 1} Citizens` : (c.user?.name || "Unknown")}</span>
                    <span>Date: {new Date(c.createdAt).toLocaleDateString()}</span>
                    <span>Category: {c.category || 'Uncategorized'}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-center md:border-l border-slate-100 dark:border-slate-800/60 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0 shrink-0">
                  <button
                    onClick={() => handleRetrieve(c.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-xl font-semibold transition-all border border-blue-200/50 dark:border-blue-800/50 w-full"
                    title="Move back to Pending"
                  >
                    <RotateCcw className="size-4" />
                    Retrieve to Pending
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Confirm Deletion</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to permanently delete {selectedIds.size} selected complaint{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
