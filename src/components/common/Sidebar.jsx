import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Leaf, 
  LayoutDashboard, 
  FolderPlus, 
  Layers, 
  Scissors, 
  Recycle, 
  FileText, 
  Settings, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { useProjects } from '../../context/useProjects';

export function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { projects } = useProjects() || { projects: [] };
  
  // Use first project ID or demo fallback for optimizer/simulation links
  const activeProjectId = projects?.[0]?.id || 'demo-proj-1';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      isActive: location.pathname === '/dashboard' || location.pathname === '/'
    },
    {
      id: 'new-project',
      label: 'New Project',
      path: '/project/new',
      icon: FolderPlus,
      isActive: location.pathname === '/project/new'
    },
    {
      id: 'fabric-optimizer',
      label: 'Fabric Optimizer',
      path: location.pathname.includes('/optimize') || location.pathname.includes('/patterns') 
        ? location.pathname 
        : `/project/${activeProjectId}/optimize`,
      icon: Layers,
      isActive: location.pathname.includes('/optimize') || location.pathname.includes('/patterns') || location.pathname === '/optimizer'
    },
    {
      id: 'cutting-simulation',
      label: 'Cutting Simulation',
      path: location.pathname.includes('/result') 
        ? location.pathname 
        : `/project/${activeProjectId}/result`,
      icon: Scissors,
      isActive: location.pathname.includes('/result') || location.pathname === '/simulation'
    },
    {
      id: 'rethread',
      label: 'ReThread',
      path: '/rethread',
      icon: Recycle,
      isActive: location.pathname === '/rethread'
    },
    {
      id: 'sustainability',
      label: 'Sustainability',
      path: location.pathname.includes('/sustainability') 
        ? location.pathname 
        : `/project/${activeProjectId}/sustainability`,
      icon: Leaf,
      isActive: location.pathname.includes('/sustainability')
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      icon: FileText,
      isActive: location.pathname === '/reports' || location.hash === '#reports'
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      isActive: location.pathname === '/settings' || location.pathname === '/profile'
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 select-none">
      <div className="space-y-6">
        {/* Brand Logo & Title */}
        <Link 
          to="/dashboard" 
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 px-2 py-1 group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#143823] text-cream-50 flex items-center justify-center shadow-xs">
            <Leaf className="w-4 h-4 text-[#D8E6DA]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-[#143823] leading-none group-hover:text-stone-950 transition-colors">
              Loom & Layer
            </span>
            <span className="text-[10px] text-stone-500 font-sans mt-0.5">
              Circular Atelier
            </span>
          </div>
        </Link>

        {/* Navigation Menu Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#E2EBE2] text-[#143823] font-semibold shadow-2xs border border-[#D0E0D2]'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-[#F2ECE1]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#143823]' : 'text-stone-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promotional Panel with Botanical Line Art */}
      <div className="mt-8 rounded-2xl bg-[#143823] p-4 text-white relative overflow-hidden shadow-xs border border-[#0F2D1C]">
        {/* Subtle Botanical Leaf Line Art SVG Background */}
        <svg
          className="absolute -right-3 -bottom-4 w-28 h-28 text-[#285A3B] opacity-50 pointer-events-none"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10 90 C 20 50, 60 20, 90 10 C 80 50, 50 80, 10 90 Z" />
          <path d="M10 90 L 75 25" />
          <path d="M35 65 C 45 60, 55 58, 65 60" />
          <path d="M45 45 C 50 40, 60 38, 70 42" />
        </svg>

        <div className="relative z-10 space-y-2">
          <div className="w-6 h-6 rounded-md bg-[#204E32] flex items-center justify-center text-[#A6C5AE]">
            <Leaf className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-serif leading-tight text-cream-100 font-medium">
            Turn <br />
            <span className="font-bold text-sm text-white">Fabric Waste</span> <br />
            into <br />
            <span className="font-bold text-sm text-white">New Possibilities</span>
          </p>
          <div className="pt-2 border-t border-[#235336]">
            <span className="text-[10px] font-sans text-[#A6C5AE] tracking-wide block">
              Reduce. Reuse. Reimagine.
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sticky Header Bar with Menu Toggle */}
      <div className="md:hidden sticky top-0 z-40 bg-[#FBF8F2] border-b border-[#EFE9DF] px-4 py-3 flex items-center justify-between shadow-2xs">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#143823] text-cream-50 flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 text-[#D8E6DA]" />
          </div>
          <span className="font-serif text-base font-bold text-[#143823]">
            Loom & Layer
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg border border-[#DDD5C7] text-stone-700 hover:bg-[#F2ECE1]"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#FBF8F2] border-r border-[#EFE9DF] transform transition-transform duration-200 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </div>

      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex w-56 lg:w-60 shrink-0 bg-[#FBF8F2] border-r border-[#EFE9DF] min-h-screen sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
}
