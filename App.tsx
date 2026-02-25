import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { useVpnViewModel } from './hooks/useVpnViewModel';
import { jsbridge } from './services/jsbridge';
import { vpnBridgeService } from './services/vpnBridgeService';
import { HomeView } from './views/HomeView';
import { ServersView } from './views/ServersView';
import { SpeedView } from './views/SpeedView';
import { PremiumView } from './views/PremiumView';

// Nav Icons
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'text-blue-400' : 'text-slate-500'}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ServerIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'text-blue-400' : 'text-slate-500'}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const SpeedIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'text-blue-400' : 'text-slate-500'}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const UserIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${active ? 'text-blue-400' : 'text-slate-500'}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BottomNav = () => {
    const location = useLocation();
    const getLinkClass = (path: string) => {
        const isActive = location.pathname === path;
        return `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-400' : 'text-slate-500'}`;
    };

    return (
        <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 pb-safe">
            <Link to="/" className={getLinkClass('/')}>
                <HomeIcon active={location.pathname === '/'} />
                <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link to="/servers" className={getLinkClass('/servers')}>
                <ServerIcon active={location.pathname === '/servers'} />
                <span className="text-[10px] font-medium">Servers</span>
            </Link>
            <Link to="/speed" className={getLinkClass('/speed')}>
                <SpeedIcon active={location.pathname === '/speed'} />
                <span className="text-[10px] font-medium">Speed</span>
            </Link>
            <Link to="/premium" className={getLinkClass('/premium')}>
                <UserIcon active={location.pathname === '/premium'} />
                <span className="text-[10px] font-medium">Premium</span>
            </Link>
        </div>
    );
}

const App: React.FC = () => {
  const vm = useVpnViewModel();
  const [bridgeStatus, setBridgeStatus] = useState<'ready' | 'loading' | 'not-available'>('loading');

  // 初始化 JSBridge
  useEffect(() => {
    // JSBridge 会在自动构造时初始化
    console.log('App mounted, initializing JSBridge...');
    
    // 监听 Bridge 就绪事件
    const unsubscribe = jsbridge.on('bridge-ready', () => {
      console.log('JSBridge is ready!');
      setBridgeStatus('ready');
    });

    // 延迟检查 Bridge 状态（防止竞态条件）
    const checkTimer = setTimeout(() => {
      if (jsbridge.isReady()) {
        console.log('JSBridge detected as ready');
        setBridgeStatus('ready');
      } else {
        console.log('JSBridge not available (browser mode)');
        setBridgeStatus('not-available');
      }
    }, 500);

    return () => {
      clearTimeout(checkTimer);
      unsubscribe();
    };
  }, []);

  return (
    <HashRouter>
      <div className="flex items-center justify-center min-h-screen bg-gray-900 font-sans text-slate-100">
        {/* Mobile Container Simulation */}
        <div className="w-full max-w-md h-[100dvh] bg-slate-900 shadow-2xl overflow-hidden flex flex-col relative">
          
          {/* Status Bar Shim (aesthetic only) */}
          <div className="h-6 w-full bg-slate-900 shrink-0 flex items-center justify-between px-4 text-[10px]">
            {/* App Environment Indicator */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                bridgeStatus === 'ready' ? 'bg-green-500' : 
                bridgeStatus === 'loading' ? 'bg-yellow-500' : 
                'bg-slate-600'
              }`}></div>
              <span className="text-slate-400">
                {bridgeStatus === 'ready' ? 'Native App' : 
                 bridgeStatus === 'loading' ? 'Loading...' : 
                 'Browser'}
              </span>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <Routes>
                <Route path="/" element={<HomeView vm={vm} />} />
                <Route path="/servers" element={<ServersView vm={vm} />} />
                <Route path="/speed" element={<SpeedView vm={vm} />} />
                <Route path="/premium" element={<PremiumView vm={vm} />} />
            </Routes>
          </div>

          {/* Bottom Navigation */}
          <BottomNav />
        </div>
      </div>
    </HashRouter>
  );
};

export default App;