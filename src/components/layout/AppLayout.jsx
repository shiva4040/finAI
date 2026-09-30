import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex bg-fin-bg-light dark:bg-fin-bg-dark text-slate-800 dark:text-slate-100 overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="ambient-glow" aria-hidden="true">
        <div className="ambient-circle-1" />
        <div className="ambient-circle-2" />
      </div>

      {/* Persistent / Responsive Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        <Navbar onToggleMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
