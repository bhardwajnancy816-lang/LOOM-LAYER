import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scissors, Leaf, LayoutDashboard, FolderGit2, Recycle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { AuthButton } from './AuthButton';

export function Navbar() {
  const location = useLocation();

  const handleProjectsClick = (e) => {
    if (location.pathname === '/dashboard') {
      e.preventDefault();
      const el = document.getElementById('projects');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', '/dashboard#projects');
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cream-300 bg-cream-50/95 backdrop-blur-md transition-colors duration-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between relative">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-crimson-800 text-cream-50 flex items-center justify-center shadow-sm group-hover:bg-crimson-900 transition-colors border border-crimson-900">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-xl font-bold tracking-tight text-atelier-950 leading-none group-hover:text-crimson-800 transition-colors">
                Loom & Layer
              </span>
              <span className="text-[10px] font-mono font-medium tracking-wider uppercase text-crimson-800 mt-1 flex items-center gap-1">
                <Leaf className="w-2.5 h-2.5" /> Marker & Pattern Atelier
              </span>
            </div>
          </Link>

          {/* Centered Atelier Navigation Capsule */}
          <nav className="hidden md:flex items-center p-1 rounded-full bg-cream-100/90 dark:bg-stone-900 border border-cream-300/80 dark:border-stone-800 shadow-2xs md:absolute md:left-1/2 md:-translate-x-1/2 backdrop-blur-sm">
            <Link
              to="/dashboard"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                location.pathname === '/dashboard' && !location.hash
                  ? 'bg-white dark:bg-stone-800 text-crimson-900 dark:text-cream-50 shadow-2xs border border-cream-300/70 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-atelier-950 dark:hover:text-cream-100 hover:bg-cream-200/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-crimson-800" />
              Dashboard
            </Link>
            <Link
              to="/dashboard#projects"
              onClick={handleProjectsClick}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                location.hash === '#projects' || (location.pathname.startsWith('/project') && !location.pathname.includes('/new'))
                  ? 'bg-white dark:bg-stone-800 text-crimson-900 dark:text-cream-50 shadow-2xs border border-cream-300/70 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-atelier-950 dark:hover:text-cream-100 hover:bg-cream-200/50'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-stone-600" />
              Projects
            </Link>
            <Link
              to="/rethread"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                location.pathname === '/rethread'
                  ? 'bg-white dark:bg-stone-800 text-crimson-900 dark:text-cream-50 shadow-2xs border border-cream-300/70 dark:border-stone-700'
                  : 'text-stone-600 dark:text-stone-400 hover:text-atelier-950 dark:hover:text-cream-100 hover:bg-cream-200/50'
              }`}
            >
              <Recycle className="w-3.5 h-3.5 text-emerald-700" />
              ReThread
            </Link>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />

            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
