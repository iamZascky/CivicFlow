"use client";

import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import { Sun, Moon } from "lucide-react";

interface MapProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  complaints?: any[];
  interactive?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
  centerMapTo?: { lat: number; lng: number } | null;
  highlightedComplaintId?: string | null;
  onMarkerClick?: (complaintId: string) => void;
  onMapClick?: () => void;
}

export default function MapView({ onLocationSelect, complaints = [], interactive = true, selectedLocation = null, centerMapTo = null, highlightedComplaintId = null, onMarkerClick, onMapClick }: MapProps = {}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const markersMapRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const prevHighlightedIdRef = useRef<string | null>(null);
  
  const [basemapTheme, setBasemapTheme] = useState<'light' | 'dark'>('dark');
  const currentThemeRef = useRef<'light' | 'dark' | null>(null);

  // Keep latest callbacks to prevent stale closures in events
  const onLocationSelectRef = useRef(onLocationSelect);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Jember City bounding box and center
    const bounds: [maplibregl.LngLatLike, maplibregl.LngLatLike] = [
      [113.1, -8.7], // Southwest coordinates (Expanded)
      [114.2, -7.8], // Northeast coordinates (Expanded)
    ];

    const isDark = document.documentElement.classList.contains("dark");
    const initialTheme = isDark ? 'dark' : 'light';
    setBasemapTheme(initialTheme);
    currentThemeRef.current = initialTheme;

    const styleUrl = initialTheme === 'dark'
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [113.682, -8.172], // Jember center
      zoom: 10, // Zoomed out to see more
      maxBounds: bounds, // Lock to Jember
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on('style.load', () => {
      if (!map.current) return;
      
      // Override default map grab cursor with default arrow
      map.current.getCanvas().style.cursor = 'default';
      
      if (!map.current.getSource('jember-boundary')) {
        map.current.addSource('jember-boundary', {
          type: 'geojson',
          data: '/jember.json'
        });
      }

      if (!map.current.getLayer('jember-boundary-fill')) {
        map.current.addLayer({
          id: 'jember-boundary-fill',
          type: 'fill',
          source: 'jember-boundary',
          layout: {},
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.05
          }
        });
      }

      if (!map.current.getLayer('jember-boundary-line')) {
        map.current.addLayer({
          id: 'jember-boundary-line',
          type: 'line',
          source: 'jember-boundary',
          layout: {},
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
            'line-dasharray': [4, 4]
          }
        });
      }
    });

    map.current.on('dragstart', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'grabbing';
    });
    
    map.current.on('dragend', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'default';
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle dynamic basemap toggles by user
  useEffect(() => {
    if (!map.current || !currentThemeRef.current) return;
    if (basemapTheme === currentThemeRef.current) return;

    const styleUrl = basemapTheme === 'dark'
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

    map.current.setStyle(styleUrl);
    currentThemeRef.current = basemapTheme;
  }, [basemapTheme]);

  // Handle map clicks robustly, always using the latest onLocationSelect closure
  useEffect(() => {
    if (!map.current || !interactive || !onLocationSelect) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (!map.current) return;
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['jember-boundary-fill']
      });

      if (features.length === 0) {
        return;
      }

      const { lng, lat } = e.lngLat;
      onLocationSelect(lat, lng);
    };

    map.current.on("click", handleMapClick);

    return () => {
      map.current?.off("click", handleMapClick);
    };
  }, [interactive, onLocationSelect]);

  // Handle map clicks for clicks outside of pins
  useEffect(() => {
    if (!map.current || !onMapClick) return;

    const handleEmptyMapClick = () => {
      if (onMapClickRef.current) {
        onMapClickRef.current();
      }
    };

    map.current.on("click", handleEmptyMapClick);

    return () => {
      map.current?.off("click", handleEmptyMapClick);
    };
  }, [onMapClick]);

  // Handle selected location marker
  useEffect(() => {
    if (!map.current || !selectedLocation) return;
    
    const { lat, lng } = selectedLocation;
    
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else {
      marker.current = new maplibregl.Marker({ color: "#ef4444", draggable: interactive })
        .setLngLat([lng, lat])
        .addTo(map.current);
        
      if (interactive) {
        marker.current.on('dragend', () => {
          const lngLat = marker.current!.getLngLat();
          if (map.current) {
            const point = map.current.project(lngLat);
            const features = map.current.queryRenderedFeatures(point, {
              layers: ['jember-boundary-fill']
            });

            if (features.length === 0) {
              // Revert to previously selected location or default center
              if (selectedLocation) {
                marker.current!.setLngLat([selectedLocation.lng, selectedLocation.lat]);
              } else {
                marker.current!.setLngLat([113.682, -8.172]);
              }
              return;
            }
          }

          if (onLocationSelectRef.current) {
            onLocationSelectRef.current(lngLat.lat, lngLat.lng);
          }
        });
      }
    }
  }, [selectedLocation]);

  // Handle map panning/zooming from external search
  useEffect(() => {
    if (!map.current || !centerMapTo) return;
    map.current.flyTo({ center: [centerMapTo.lng, centerMapTo.lat], zoom: 15 });
  }, [centerMapTo]);

  // Handle markers for complaints
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersMapRef.current.forEach(m => m.remove());
    markersMapRef.current.clear();

    complaints.forEach((complaint) => {
      if (!complaint.latitude || !complaint.longitude) return;
      
      const color = 
        complaint.status === "PENDING" ? "#ef4444" :
        complaint.status === "IN_PROGRESS" ? "#f97316" :
        complaint.status === "RESOLVED" ? "#10b981" :
        complaint.status === "REJECTED" ? "#64748b" : 
        "#3b82f6";
      
      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(
        `<div class="p-2 min-w-[220px] text-slate-800 dark:text-slate-100">
          <h3 class="font-bold text-base mb-0.5">${complaint.title}</h3>
          <div class="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mb-2">
            📅 ${new Date(complaint.createdAt).toLocaleDateString("en-US", {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div class="flex gap-2 mb-2">
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350">${complaint.category || 'Uncategorized'}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${
              complaint.status === 'RESOLVED' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                : complaint.status === 'PENDING'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                : complaint.status === 'IN_PROGRESS'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }">${complaint.status}</span>
          </div>
          <p class="text-sm line-clamp-2 text-slate-600 dark:text-slate-300">${complaint.description}</p>
        </div>`
      );

      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center';
      el.style.width = '27px';
      el.style.height = '41px';
      
      // Custom SVG pin
      el.innerHTML = `
        <svg width="27" height="41" viewBox="0 0 27 41" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 0C6.044 0 0 6.044 0 13.5C0 23.625 13.5 41 13.5 41C13.5 41 27 23.625 27 13.5C27 6.044 20.956 0 13.5 0ZM13.5 18.25C10.876 18.25 8.75 16.124 8.75 13.5C8.75 10.876 10.876 8.75 13.5 8.75C16.124 8.75 18.25 10.876 18.25 13.5C18.25 16.124 16.124 18.25 13.5 18.25Z" fill="${color}"/>
        </svg>
      `;

      if (complaint.duplicateCount && complaint.duplicateCount > 0) {
        const badge = document.createElement('div');
        badge.className = 'absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 z-10 animate-bounce';
        badge.innerText = (complaint.duplicateCount + 1).toString();
        el.appendChild(badge);
      }

      const newMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([complaint.longitude, complaint.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      const markerElement = newMarker.getElement();
      markerElement.style.cursor = 'pointer';

      markerElement.addEventListener('click', (e) => {
        // Prevent click bubbling and trigger highlight callback
        e.stopPropagation();
        if (onMarkerClickRef.current) {
          onMarkerClickRef.current(complaint.id);
        }
      });
        
      markersMapRef.current.set(complaint.id, newMarker);
    });
  }, [complaints]);

  // Handle highlighted complaint hover
  useEffect(() => {
    if (!map.current) return;

    let hasHighlight = false;

    markersMapRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      const svg = el.querySelector('svg');
      
      if (id === highlightedComplaintId) {
        hasHighlight = true;
        if (svg) svg.classList.add("animate-bounce");
        if (!marker.getPopup().isOpen()) marker.togglePopup();
        map.current?.flyTo({ center: marker.getLngLat(), zoom: 14, speed: 1.2 });
      } else {
        if (svg) svg.classList.remove("animate-bounce");
        if (marker.getPopup().isOpen()) marker.togglePopup();
      }
    });

    // Reset map view to default if highlighted ID becomes null, but only if it was previously highlighted
    if (!hasHighlight && highlightedComplaintId === null && prevHighlightedIdRef.current !== null) {
      map.current.flyTo({ center: [113.682, -8.172], zoom: 10, speed: 1.2 });
    }

    prevHighlightedIdRef.current = highlightedComplaintId;
  }, [highlightedComplaintId]);

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Floating Basemap Style Switcher */}
      <div className="absolute bottom-4 left-4 z-10 flex bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-1 rounded-xl shadow-lg transition-all duration-300">
        <button
          onClick={() => setBasemapTheme('light')}
          className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 " + (basemapTheme === 'light' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
        >
          <Sun className="size-3.5" />
          <span>Default</span>
        </button>
        <button
          onClick={() => setBasemapTheme('dark')}
          className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 " + (basemapTheme === 'dark' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
        >
          <Moon className="size-3.5" />
          <span>Dark</span>
        </button>
      </div>
    </div>
  );
}
