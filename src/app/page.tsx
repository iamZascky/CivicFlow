import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, BarChart3, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b-0 border-white/10 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-bold text-2xl bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">
            CivicFlow
          </div>
          <nav className="flex gap-4">
            <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-500 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/login" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20">
              Report Issue
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col pt-16">
        <section className="relative flex-1 flex items-center justify-center min-h-[90vh] overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 dark:opacity-20" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel mb-8 text-sm font-medium text-blue-600 dark:text-blue-400 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Smart City Initiative for Jember
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Intelligent Public <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">Complaint Management</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-300 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Report local issues instantly. Our AI-powered platform automatically categorizes, analyzes sentiment, and routes your complaints for faster resolution.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/auth/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xl shadow-blue-500/20 transition-all hover:scale-105">
                Submit a Report
                <ArrowRight className="size-5" />
              </Link>
              <Link href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-200 glass-panel hover:bg-white/10 rounded-xl transition-all">
                Explore Features
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">Powered by Artificial Intelligence</h2>
              <p className="mt-4 text-slate-500 max-w-2xl mx-auto">Our platform uses advanced Gemini AI to streamline the public service pipeline.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Auto-Categorization", desc: "AI automatically routes complaints to the correct department." },
                { icon: BarChart3, title: "Sentiment Analysis", desc: "Real-time urgency and sentiment detection to prioritize critical issues." },
                { icon: MapPin, title: "Interactive Maps", desc: "Geographic tracking of issues locked to Jember City limits." }
              ].map((feature, i) => (
                <div key={i} className="glass-panel p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <feature.icon className="size-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
