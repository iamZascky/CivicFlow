"use client";

import { useMemo } from "react";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from "recharts";
import { format, parseISO } from "date-fns";

interface AnalyticsDashboardProps {
  complaints: any[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Infrastructure": "#3b82f6",
  "Environment": "#10b981",
  "Traffic": "#f59e0b",
  "Public Safety": "#ef4444",
  "Other": "#8b5cf6"
};

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const TOOLTIP_STYLE = { 
  borderRadius: '12px', 
  border: '1px solid rgba(255,255,255,0.1)', 
  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', 
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  color: '#f8fafc' 
};
const LABEL_STYLE = { color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' };

export default function AnalyticsDashboard({ complaints }: AnalyticsDashboardProps) {
  // --- Data Aggregation ---

  // 1. Category Distribution (Pie Chart)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    complaints.forEach(c => {
      const cat = c.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [complaints]);

  // 2. Priority & Sentiment Analysis (Bar Chart)
  const priorityData = useMemo(() => {
    const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    return priorities.map(p => {
      const filtered = complaints.filter(c => c.priority === p);
      return {
        name: p,
        Positive: filtered.filter(c => c.sentiment?.toUpperCase() === "POSITIVE").length,
        Neutral: filtered.filter(c => !c.sentiment || c.sentiment?.toUpperCase() === "NEUTRAL").length,
        Negative: filtered.filter(c => c.sentiment?.toUpperCase() === "NEGATIVE").length,
      };
    });
  }, [complaints]);

  // 3. Monthly/Weekly Trends (Area Chart)
  const timelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    complaints.forEach(c => {
      if (!c.createdAt) return;
      const dateStr = format(parseISO(c.createdAt), "MMM dd");
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    // Convert to sorted array (assuming complaints are roughly in order)
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [complaints]);

  // 4. Regional Distribution (Bar Chart)
  const regionalData = useMemo(() => {
    const counts: Record<string, number> = {};

    complaints.forEach(c => {
      const region = c.subdistrict || "Unknown";
      counts[region] = (counts[region] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, complaints]) => ({ name, complaints }))
      .filter(r => r.complaints > 0)
      .sort((a, b) => b.complaints - a.complaints);
  }, [complaints]);

  if (complaints.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl text-slate-500">
        Not enough data to generate analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Row: Category Pie & Regional Bar */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Complaint Categories</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  isAnimationActive={false}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={LABEL_STYLE}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Regional Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  isAnimationActive={false}
                  cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={LABEL_STYLE}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="complaints" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Middle Row: Trend Area Chart */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Complaint Volume Trends</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="date" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip 
                isAnimationActive={false}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={LABEL_STYLE}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Priority & Sentiment */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Sentiment by Priority</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis type="number" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip 
                isAnimationActive={false}
                cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={LABEL_STYLE}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Bar dataKey="Negative" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Neutral" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Positive" stackId="a" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
