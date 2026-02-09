import React from 'react';
import { VpnViewModel } from '../types';
import { ConnectButton } from '../components/ConnectButton';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  vm: VpnViewModel;
}

// Generate some fake historical data for the chart
const data = Array.from({ length: 20 }, (_, i) => ({
  name: i,
  uv: Math.floor(Math.random() * 50) + 10,
}));

export const HomeView: React.FC<Props> = ({ vm }) => {
  return (
    <div className="flex flex-col h-full pt-6 px-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">V2Ray VPN</h1>
          <p className="text-slate-400 text-xs uppercase tracking-wider">
            {vm.isPremium ? 'Premium Plan' : 'Free Plan'}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
          <span className="text-lg">👤</span>
        </div>
      </div>

      {/* Connection Button Area */}
      <div className="flex-grow flex flex-col items-center justify-center">
        <ConnectButton 
          status={vm.status} 
          onClick={vm.isConnected ? vm.disconnect : vm.connect} 
          duration={vm.duration}
        />
        
        {/* Selected Node Pill */}
        <div className="mt-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full px-6 py-3 flex items-center gap-3 w-full max-w-xs justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-2xl">{vm.selectedNode?.flag}</span>
            <div className="flex flex-col truncate">
              <span className="text-white text-sm font-medium truncate">{vm.selectedNode?.name}</span>
              <span className="text-slate-400 text-xs">{vm.selectedNode?.protocol.toUpperCase()} • {vm.selectedNode?.ping}ms</span>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Mini Traffic Chart (Decorative in Home) */}
      <div className="h-32 w-full mt-6 mb-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="flex justify-between mb-2">
            <span className="text-xs text-slate-400">TRAFFIC ACTIVITY</span>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE
            </span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="uv" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorUv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};