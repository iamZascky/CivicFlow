"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Map from "@/components/Map";
import { PlusCircle, Loader2, CheckCircle, AlertTriangle, Clock, Activity, Map as MapIcon, Image as ImageIcon, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import { useSearchParams } from "next/navigation";

function CitizenDashboardContent() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [publicComplaints, setPublicComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealPhoto, setAppealPhoto] = useState<File | null>(null);
  const [isAppealing, setIsAppealing] = useState(false);

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "reports";

  const [highlightedComplaintId, setHighlightedComplaintId] = useState<string | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [locatingId, setLocatingId] = useState<string | null>(null);
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
    }, 1200); // matches the flyTo animation speed in Map.tsx
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

  // Form states
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportDate, setReportDate] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
      setReportDate(localISOTime);
      setPhoto(null);
    }
  }, [showModal]);

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
      
      const pubRes = await fetch("/api/complaints?public=true");
      if (pubRes.ok) {
        setPublicComplaints(await pubRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const searchAddress = async () => {
    if (!address.trim()) return;
    setIsSearching(true);
    try {
      // 1. Try search using Photon (Komoot's OSM geocoder) which has much better fuzzy matching
      const query = encodeURIComponent(address);
      let res = await fetch(`https://photon.komoot.io/api/?q=${query}&lat=-8.172&lon=113.682&limit=1`);
      let data = await res.json();
      let features = data.features;

      // 2. Fallback: try adding "Jember" explicitly if first search fails
      if (!features || features.length === 0) {
        const queryFallback = encodeURIComponent(address + " Jember");
        res = await fetch(`https://photon.komoot.io/api/?q=${queryFallback}&lat=-8.172&lon=113.682&limit=1`);
        data = await res.json();
        features = data.features;
      }

      if (features && features.length > 0) {
        // Photon uses [lon, lat] coordinates
        const [lon, lat] = features[0].geometry.coordinates;
        
        // Rough bounding box check for Jember
        if (lon < 113.2 || lon > 114.1 || lat < -8.6 || lat > -7.8) {
          return;
        }

        setLat(lat);
        setLng(lon);
        setMapCenter({ lat, lng: lon }); // Only auto-pan when a search is successfully performed
      } else {
        alert("Address not found in map database. Please try a more general name, or click directly on the map to set the pin manually.");
      }
    } catch (e) {
      console.error(e);
      alert("Search failed. Please check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) {
      alert("Please select a location on the map.");
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl = null;
      if (photo) {
        const formData = new FormData();
        formData.append("file", photo);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          alert("Failed to upload photo. Proceeding without photo.");
        }
      }

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: desc,
          latitude: lat,
          longitude: lng,
          imageUrl,
          incidentDate: reportDate ? new Date(reportDate).toISOString() : undefined
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setTitle(""); setDesc(""); setLat(null); setLng(null); setReportDate("");
        fetchComplaints();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Submission failed: ${errorData.error || res.statusText}. Please check the server console for Prisma errors. You may need to restart your development server to load the new database schema.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
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
        setComplaints(prev => prev.filter((c: any) => c.id !== id));
        if (highlightedComplaintId === id) setHighlightedComplaintId(null);
        if (selectedComplaintId === id) setSelectedComplaintId(null);
      } else {
        alert("Failed to delete complaint");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting the complaint");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAppealSubmit = async () => {
    if (!appealingId || !appealText.trim()) return;
    setIsAppealing(true);
    try {
      let imageUrl = null;
      if (appealPhoto) {
        const formData = new FormData();
        formData.append("file", appealPhoto);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          alert("Failed to upload photo. Proceeding without new photo.");
        }
      }

      const res = await fetch(`/api/complaints/${appealingId}/appeal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appealText,
          imageUrl,
        }),
      });

      if (res.ok) {
        setAppealingId(null);
        setAppealText("");
        setAppealPhoto(null);
        fetchComplaints();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Appeal failed: ${errorData.error || res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while submitting appeal");
    } finally {
      setIsAppealing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome, {session?.user?.name}</h1>
          <p className="text-slate-500">Track and manage your public complaints</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-all hover:scale-105"
        >
          <PlusCircle className="size-5" />
          <span className="hidden sm:inline">New Report</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-4">Submit New Complaint</h2>
            <div className="flex-1 overflow-auto custom-scrollbar pr-2 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="E.g., Pothole on main street" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Description</label>
                <textarea required value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Describe the issue in detail. AI will analyze this." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Date & Time of Incident</label>
                <input
                  type="datetime-local"
                  required
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700 dark:text-slate-200 dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Photo Evidence (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={e => setPhoto(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                />
                {photo && (
                  <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="size-3" /> Selected: {photo.name}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Pin Location on Map</label>
                <div className="flex gap-2 mb-3">
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                    className="flex-1 px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Search manual address (e.g. Alun-alun Jember)"
                  />
                  <button type="button" onClick={searchAddress} disabled={isSearching} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium flex items-center justify-center min-w-[80px]">
                    {isSearching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
                  </button>
                </div>
                <div className="h-[350px] sm:h-[400px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <Map
                    interactive={true}
                    onLocationSelect={(lat, lng) => { setLat(lat); setLng(lng); }}
                    selectedLocation={lat && lng ? { lat, lng } : null}
                    centerMapTo={mapCenter}
                  />
                </div>
                {lat && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">✓ Location selected: {lat.toFixed(4)}, {lng?.toFixed(4)}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={isSubmitting || !lat} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-all">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden flex flex-col">
            <div className="p-6 pb-8">
              <div className="size-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="size-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">Delete Complaint?</h3>
              <p className="text-slate-500 text-sm mb-6">
                This complaint will be permanently deleted. You cannot undo this action.
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

      {tab === "analytics" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          <div className="col-span-1 md:col-span-3 space-y-6">
            <h2 className="text-xl font-bold">Your Submission Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Submitted", value: complaints.length, icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "In Progress", value: complaints.filter((c: any) => c.status === "IN_PROGRESS").length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "Pending Review", value: complaints.filter((c: any) => c.status === "PENDING").length, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
                { label: "Resolved", value: complaints.filter((c: any) => c.status === "RESOLVED").length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              ].map((stat, i) => (
                <div key={i} className="glass-panel p-6 rounded-2xl flex items-center gap-4 border border-slate-200/30 dark:border-slate-800/30 hover:scale-[1.02] transition-all">
                  <div className={`size-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon className="size-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-panel p-6 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Resolution Rate</h3>
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative size-32 flex items-center justify-center mb-4">
                    {(() => {
                      const resolved = complaints.filter((c: any) => c.status === "RESOLVED").length;
                      const total = complaints.length;
                      const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
                      return (
                        <>
                          <svg className="size-full transform -rotate-90">
                            <circle cx="64" cy="64" r="54" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                            <circle cx="64" cy="64" r="54" className="stroke-emerald-500 transition-all duration-1000" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 * (1 - rate / 100)} strokeLinecap="round" />
                          </svg>
                          <div className="absolute text-3xl font-extrabold">{rate}%</div>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-slate-500 text-sm text-center">Percentage of your submitted complaints that have been fully resolved by administrators.</p>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200">Reports Category Distribution</h3>
                <div className="space-y-4">
                  {(() => {
                    const total = complaints.length;
                    const cats = complaints.reduce((acc: any, curr: any) => {
                      const cat = curr.category || "Uncategorized";
                      acc[cat] = (acc[cat] || 0) + 1;
                      return acc;
                    }, {});
                    if (Object.keys(cats).length === 0) {
                      return <p className="text-slate-550 text-sm text-center py-10">No data available</p>;
                    }
                    return Object.entries(cats).map(([category, count]: [string, any]) => {
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={category} className="space-y-1.5">
                          <div className="flex justify-between text-sm font-semibold">
                            <span>{category}</span>
                            <span className="text-slate-500">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {selectedComplaintId ? "Pinned Report" : "Your Recent Reports"}
              </h2>
              {selectedComplaintId && (
                <button
                  onClick={() => {
                    setSelectedComplaintId(null);
                    setHighlightedComplaintId(null);
                  }}
                  className="text-xs font-bold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/25 transition-all cursor-pointer"
                >
                  Show All ({complaints.length})
                </button>
              )}
            </div>
            {loading ? (
              <div className="h-40 flex items-center justify-center glass-panel rounded-2xl"><Loader2 className="size-6 animate-spin text-blue-500" /></div>
            ) : (selectedComplaintId ? complaints.filter((c: any) => c.id === selectedComplaintId) : complaints).length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-2xl text-slate-500">No complaints filed yet. Create a new report to get started!</div>
            ) : (
              <div className="space-y-4">
                {(selectedComplaintId ? complaints.filter((c: any) => c.id === selectedComplaintId) : complaints).map((c: any) => (
                  <div
                    key={c.id}
                    id={`complaint-card-${c.id}`}
                    className={`glass-panel p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 hover:shadow-lg transition-shadow border-l-4 transition-all duration-300 ${highlightedComplaintId === c.id
                        ? 'shadow-xl ring-2 ring-blue-500/50 dark:ring-blue-400/50 bg-slate-100/60 dark:bg-slate-900/30'
                        : ''
                      }`}
                    style={{ borderLeftColor: c.priority === 'CRITICAL' ? '#ef4444' : c.priority === 'HIGH' ? '#f97316' : '#3b82f6' }}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                        <h3 className="font-bold text-lg">{c.title}</h3>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1">
                          🕒 Report Date: {new Date(c.createdAt).toLocaleDateString("en-US", {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-slate-505 dark:text-slate-400 text-sm leading-relaxed">{c.description}</p>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-2 flex items-center gap-1.5">
                        📅 Incident Date & Time: {c.incidentDate ? new Date(c.incidentDate).toLocaleDateString("en-US", {
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
                      {c.imageUrl && (
                        <div className="mt-3">
                          <button
                            onClick={() => setViewingPhotoUrl(c.imageUrl)}
                            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold border border-purple-200/50 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:text-purple-300 transition-all duration-300 btn-bouncy"
                          >
                            <ImageIcon className="size-3.5" />
                            View Photo
                          </button>
                        </div>
                      )}
                      {c.suggestDelete && (
                        <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                          <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">
                            <AlertTriangle className="size-4 inline mr-1.5 mb-0.5" />
                            Couldn't understand this complaint. We suggest deleting it and submitting a new one with more details.
                          </p>
                          <button
                            onClick={() => confirmDelete(c.id)}
                            className="shrink-0 px-4 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-800 dark:hover:bg-rose-700 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            Delete Complaint
                          </button>
                        </div>
                      )}
                      {c.status === 'REJECTED' && c.rejectionReason && (
                        <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="size-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">Report Rejected</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                Reason: {c.rejectionReason}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setAppealingId(c.id)}
                            className="shrink-0 px-4 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            Appeal Decision
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-start md:items-end min-w-[130px] shrink-0">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-800 w-full text-center">{c.category || 'Pending'}</span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full w-full text-center ${c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{c.status}</span>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 w-full text-center">{c.priority} Priority</span>

                        <button
                          onClick={() => handleLocateOnMap(c.id)}
                          className={`mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all duration-300 btn-bouncy cursor-pointer w-full
                            ${highlightedComplaintId === c.id
                              ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                              : 'bg-white/50 border-slate-250 text-slate-600 hover:bg-blue-600 hover:text-white dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-blue-600 dark:hover:text-white hover:border-transparent'
                            }
                          `}
                        >
                          <MapIcon className={`size-3.5 ${locatingId === c.id ? 'animate-bounce' : ''}`} />
                          <span>{locatingId === c.id ? "Locating..." : highlightedComplaintId === c.id ? "Pinned" : "Find on Map"}</span>
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-[700px] sticky top-8">
            <h2 className="text-xl font-bold mb-4">Live Map</h2>
            <Map
              complaints={publicComplaints}
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
      )}

      {appealingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-6 overflow-auto custom-scrollbar">
              <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">Appeal Rejected Report</h3>
              <p className="text-slate-500 text-sm mb-6">
                Please provide additional details or evidence to appeal this rejection. This will reopen your report for admin review.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Appeal Message</label>
                  <textarea
                    required
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 h-28 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Explain why this report should be reconsidered..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">New Photo Evidence (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setAppealPhoto(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800/50 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                  />
                  {appealPhoto && (
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="size-3" /> Selected: {appealPhoto.name}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 w-full mt-8">
                <button 
                  onClick={() => { setAppealingId(null); setAppealText(""); setAppealPhoto(null); }} 
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAppealSubmit}
                  disabled={isAppealing || !appealText.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-xl font-semibold transition-colors flex justify-center items-center gap-2"
                >
                  {isAppealing ? <Loader2 className="size-4 animate-spin" /> : "Submit Appeal"}
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

export default function CitizenDashboard() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin size-8 text-blue-500" />
      </div>
    }>
      <CitizenDashboardContent />
    </Suspense>
  );
}
