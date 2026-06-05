"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
  colorClass?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export default function CustomSelect({ value, onChange, options, className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${isOpen ? "z-[100]" : "z-10"}`} ref={dropdownRef}>
      <button 
        type="button"
        className={`flex items-center justify-between w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-xl px-3.5 py-2.5 cursor-pointer shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-all outline-none focus:ring-2 focus:ring-blue-500/50 ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
          {selectedOption ? selectedOption.label : "Select..."}
        </span>
        <ChevronDown className={`size-4 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 origin-top ${
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <div
                key={opt.value}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? (opt.colorClass || "bg-blue-50/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold") 
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-medium"
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="size-4 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
