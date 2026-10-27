import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export function RootLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FBF8F2] text-stone-900 flex flex-col md:flex-row antialiased selection:bg-[#E2EBE2] selection:text-[#143823]">
      {/* Global Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-x-hidden min-w-0 max-w-[1600px]">
        <ErrorBoundary
          componentName="AtelierRouteView"
          title="Atelier Workspace Error"
          message="An error occurred while rendering this page. You can retry or navigate back to the dashboard."
          fallbackActionLabel="Back to Dashboard"
          onFallbackAction={() => { window.location.href = '/dashboard'; }}
        >
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
