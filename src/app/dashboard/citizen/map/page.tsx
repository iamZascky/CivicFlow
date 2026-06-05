"use client";

import { useState, useEffect } from "react";
import Map from "@/components/Map";
import { Loader2 } from "lucide-react";
import { io } from "socket.io-client";

export default function CitizenMapPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
    
    // Listen for real-time updates while on the map view
    const socket = io();
    socket.on("new-complaint", () => fetchComplaints());
    socket.on("status-update", () => fetchComplaints());
    
    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await fetch("/api/complaints?public=true");
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

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] w-full flex flex-col space-y-4 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Live City Map</h1>
        <p className="text-slate-500">Real-time geographic distribution of all public complaints across Jember Regency.</p>
      </div>
      
      <div className="flex-1 glass-panel rounded-2xl relative overflow-hidden">
        <Map complaints={complaints} interactive={false} />
      </div>
    </div>
  );
}
