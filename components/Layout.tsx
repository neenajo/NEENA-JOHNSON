
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from '../firebase';

interface LayoutProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isDark: boolean;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, isDark, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView(AppView.WORKSPACE);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const navItems = [
    { id: AppView.WORKSPACE, label: 'Studio Workspace', icon: '🎙️' },
    { id: AppView.HISTORY, label: 'History', icon: '📜' },
    { id: AppView.REALTIME, label: 'Real-Time Plot', icon: '📈' },
    { id: AppView.ANALYSIS, label: 'Analysis Report', icon: '📊' }
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#05070a] overflow-hidden font-sans text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-[70] lg:relative lg:flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800/40 shadow-2xl bg-white dark:bg-[#0d1117] text-slate-900 dark:text-white
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} 
          ${isMobileMenuOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-8 h-24 flex items-center justify-between overflow-hidden shrink-0">
          {(!isCollapsed || isMobileMenuOpen) ? (
            <div className="animate-fadeIn min-w-0">
              <h1 className="text-2xl font-black tracking-tighter text-red-500 flex items-center truncate">
                EMODUB<span className="text-slate-400 dark:text-slate-500 ml-1">AI</span>
              </h1>
              <span className="text-[10px] text-slate-500 block font-black mt-1 uppercase tracking-[0.3em] truncate">Research Laboratory</span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <span className="text-2xl shrink-0">🧬</span>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-w-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center px-5 py-3.5 rounded-xl transition-all duration-200 group relative min-w-0 ${
                currentView === item.id 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/5' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <span className={`text-lg shrink-0 transition-transform group-hover:scale-110 ${(isCollapsed && !isMobileMenuOpen) ? 'mx-auto' : 'mr-4'}`}>
                {item.icon}
              </span>
              {(!isCollapsed || isMobileMenuOpen) && (
                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden truncate">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <header className="h-24 bg-white/80 dark:bg-[#05070a]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/40 flex items-center justify-between px-8 md:px-12 shrink-0 z-40">
          <div className="flex items-center space-x-6 min-w-0">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) setIsMobileMenuOpen(true);
                else setIsCollapsed(!isCollapsed);
              }}
              className="p-2.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
               <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.3em] truncate">
                 {navItems.find(i => i.id === currentView)?.label}
               </h3>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[100px]">{user.displayName}</div>
                  <button onClick={handleLogout} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Sign Out</button>
                </div>
                <img src={user.photoURL || ''} alt="Profile" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800" />
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto min-w-0 scroll-smooth">
          <div className="max-w-[1600px] mx-auto w-full px-8 md:px-16 py-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
