import React, { useState, useEffect } from 'react';
import { VpnViewModel } from '../types';

interface Props {
  vm: VpnViewModel;
}

export const SpeedView: React.FC<Props> = ({ vm }) => {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!vm.isConnected) {
        alert("Please connect to a VPN server first.");
        return;
    }
    setTesting(true);
    await vm.runSpeedTest();
    setTesting(false);
  };

  // Calculate gauge rotation (-90deg to 90deg)
  // Max speed assumes 100Mbps for full rotation visual
  const rotation = Math.min(vm.speedStats.download, 100) * 1.8 - 90;

  return (
    <div className="flex flex-col h-full pt-6 px-6 bg-slate-900">
      <h2 className="text-xl font-bold text-white mb-8">Speed Test</h2>

      {/* Main Gauge Area */}
      <div className="flex-grow flex flex-col items-center justify-center relative">
        
        {/* Gauge Background */}
        <div className="w-64 h-32 overflow-hidden relative mb-4">
             <div className="w-64 h-64 rounded-full border-[12px] border-slate-800 box-border"></div>
        </div>

        {/* Gauge Value (Absolute for centering) */}
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-[10%] w-64 h-32 overflow-hidden">
             <div 
                className="w-64 h-64 rounded-full border-[12px] border-transparent border-t-blue-500 border-r-blue-500 transition-all duration-1000 ease-out"
                style={{ transform: `rotate(${rotation}deg)` }}
             ></div>
        </div>

        {/* Center Text */}
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 mt-8 text-center">
            <div className="text-5xl font-bold text-white tracking-tighter">
                {vm.speedStats.download.toFixed(1)}
            </div>
            <div className="text-sm text-slate-400 uppercase tracking-widest mt-1">Mbps</div>
            <div className="text-xs text-blue-400 mt-1">DOWNLOAD</div>
        </div>

        {/* Start Button */}
        <div className="mt-12">
            {!testing ? (
                <button 
                    onClick={handleTest}
                    className={`px-12 py-3 rounded-full font-bold tracking-widest transition-all ${
                        vm.isConnected 
                        ? 'bg-transparent border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    {vm.isConnected ? 'GO' : 'CONNECT FIRST'}
                </button>
            ) : (
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-blue-400 text-xs tracking-widest animate-pulse">TESTING...</span>
                </div>
            )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center border border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-white font-bold text-lg">{vm.speedStats.download || '--'}</span>
            <span className="text-[10px] text-slate-500 uppercase">Download</span>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center border border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-white font-bold text-lg">{vm.speedStats.upload || '--'}</span>
            <span className="text-[10px] text-slate-500 uppercase">Upload</span>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center border border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-white font-bold text-lg">{vm.speedStats.latency || '--'}</span>
            <span className="text-[10px] text-slate-500 uppercase">Ping</span>
        </div>
      </div>
    </div>
  );
};