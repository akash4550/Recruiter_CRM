import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', roles: ['Super Admin', 'Admin', 'HR', 'Recruiter', 'Sales Executive', 'Employee'] },
    { name: 'Clients', path: '/clients', roles: ['Super Admin', 'Admin', 'HR', 'Sales Executive'] },
    { name: 'Employees', path: '/employees', roles: ['Super Admin', 'Admin'] },
    { name: 'Recruiters', path: '/recruiters', roles: ['Super Admin', 'Admin'] },
    { name: 'Open Positions', path: '/positions', roles: ['Super Admin', 'Admin', 'HR', 'Recruiter'] },
    { name: 'Tasks & Follow-ups', path: '/tasks', roles: ['Super Admin', 'Admin', 'HR', 'Recruiter', 'Sales Executive', 'Employee'] },
  ];

  // Safely extract the root section name for the header, ignoring nested IDs/actions
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSection = pathSegments[0] 
    ? pathSegments[0].replace('-', ' ') 
    : 'System Home';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      {/* Mobile Overlay Background */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-brand-dark text-slate-200 flex flex-col justify-between shadow-xl 
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-accent rounded flex items-center justify-center text-brand-dark font-black tracking-tighter">M</div>
              <span className="text-xl font-bold tracking-tight text-white">
                Mayzax <span className="text-brand-accent font-normal text-sm block">CRM Portal</span>
              </span>
            </div>
            {/* Mobile Close Button */}
            <button 
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => {
              if (item.roles.includes(user?.role)) {
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)} // Close drawer on mobile nav
                    className={({ isActive }) => `
                      block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-brand-primary text-white shadow-md' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }
                    `}
                  >
                    {item.name}
                  </NavLink>
                );
              }
              return null;
            })}
          </nav>
        </div>

        {/* User Identity Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col space-y-3">
          <div className="px-2">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-brand-accent truncate font-mono uppercase">{user?.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full text-left px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 rounded transition-colors flex items-center space-x-2"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Screen Content Frame */}
      <div className="flex-1 flex flex-col w-full h-full min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-4">
            {/* Mobile Hamburger Toggle */}
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded"
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>
            <h1 className="text-lg font-bold text-slate-800 capitalize">
              {currentSection}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Real-time Indicator Notification Bell Layout */}
            <div className="relative p-2 text-slate-500 hover:text-slate-700 cursor-pointer">
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-accent rounded-full"></span>
              🔔
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
