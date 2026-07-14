import { Home } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-white shadow-glow-cyan">
            <Home size={20} />
          </div>
          <div>
            <div className="text-lg font-extrabold text-gradient leading-none">UZ Realty</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Real-time aggregator</div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <a href="#top" className="hover:text-violet-600 transition-colors">Bosh sahifa</a>
          <a href="#stats" className="hover:text-violet-600 transition-colors">Statistika</a>
          <a href="#listings" className="hover:text-violet-600 transition-colors">E'lonlar</a>
          <a href="#map" className="hover:text-violet-600 transition-colors">Xarita</a>
        </nav>
        <a
          href="https://github.com/RaximjonRaximov/uz-real-estate-aggregator"
          target="_blank"
          rel="noopener noreferrer"
          className="neo-btn-secondary hidden sm:flex"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
