import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, CheckCircle2, ChevronDown, LayoutDashboard, FolderGit2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export function AuthButton() {
  const navigate = useNavigate();
  const { user, loading, isConfigured, signInWithGoogle, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isConfigured) return null;

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-cream-200 animate-pulse border border-cream-300" />
    );
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const handleGoTo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  // 1. Signed-out state: Google Sign In Button
  if (!user) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-cream-300 text-stone-800 hover:bg-cream-100 hover:border-cream-400 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
        title="Sign in with your Google Account to sync projects to Supabase Cloud"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.29 21.43 7.37 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
          />
        </svg>
        <span className="hidden sm:inline">
          {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
        </span>
        <span className="sm:hidden">
          {isSigningIn ? '...' : 'Sign In'}
        </span>
      </button>
    );
  }

  // 2. Signed-in state: Profile avatar with dropdown
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Atelier User';
  const email = user.email || '';
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full sm:rounded-lg bg-cream-100/90 border border-cream-300 hover:border-cream-400 hover:bg-cream-200/70 transition-colors cursor-pointer text-left"
        title={`Signed in as ${email}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover border border-cream-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-crimson-800 text-cream-50 flex items-center justify-center text-xs font-bold font-mono">
            {initial}
          </div>
        )}
        <span className="hidden sm:inline text-xs font-medium text-atelier-950 max-w-[110px] truncate">
          {displayName}
        </span>
        <ChevronDown className="hidden sm:inline w-3 h-3 text-stone-500" />
      </button>

      {/* Profile & Session Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-cream-300 shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header row linking directly to Profile */}
          <button
            type="button"
            onClick={() => handleGoTo('/profile')}
            className="w-full text-left px-3.5 py-2.5 border-b border-cream-200 hover:bg-cream-50/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover border border-cream-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-crimson-800 text-cream-50 flex items-center justify-center text-sm font-bold font-mono">
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-atelier-950 truncate hover:text-crimson-800 transition-colors">{displayName}</p>
                <p className="text-[11px] text-stone-500 truncate font-mono">{email}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-cream-100 flex items-center justify-end text-[11px] text-stone-400 hover:text-crimson-800 font-sans">
              <span>View Profile &rarr;</span>
            </div>
          </button>

          {/* Navigation Links in Dropdown */}
          <div className="px-1.5 py-1.5 space-y-0.5 border-b border-cream-200">
            <button
              type="button"
              onClick={() => handleGoTo('/profile')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-cream-100 hover:text-atelier-950 transition-colors cursor-pointer text-left"
            >
              <User className="w-3.5 h-3.5 text-crimson-700" />
              <span>My Atelier Profile</span>
            </button>

            <button
              type="button"
              onClick={() => handleGoTo('/dashboard')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-cream-100 hover:text-atelier-950 transition-colors cursor-pointer text-left"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-stone-600" />
              <span>Production Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => handleGoTo('/dashboard#projects')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-cream-100 hover:text-atelier-950 transition-colors cursor-pointer text-left"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-stone-600" />
              <span>Atelier Projects</span>
            </button>
          </div>

          <div className="px-1.5 pt-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
