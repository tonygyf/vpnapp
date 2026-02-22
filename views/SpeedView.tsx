import React, { useState, useEffect } from 'react';
import { VpnViewModel } from '../types';

interface Props {
  vm: VpnViewModel;
}

export const SpeedView: React.FC<Props> = ({ vm }) => {
  const [testing, setTesting] = useState(false);
  const [testPhase, setTestPhase] = useState<'idle' | 'download' | 'upload' | 'ping' | 'complete'>('idle');
  const [displaySpeed, setDisplaySpeed] = useState(0);

  const handleTest = async () => {
    if (!vm.isConnected) {
      alert("Please connect to a VPN server first.");
      return;
    }
    setTesting(true);
    setTestPhase('download');
    setDisplaySpeed(0);

    // Simulate download test with progressive animation
    await simulateDownloadTest();
    
    setTestPhase('upload');
    // Simulate upload test
    await simulateUploadTest();
    
    setTestPhase('ping');
    // Simulate ping test
    await simulatePingTest();
    
    // Run actual speed test
    await vm.runSpeedTest();
    
    setTestPhase('complete');
    setTesting(false);
    setTimeout(() => {
      setTestPhase('idle');
    }, 2000);
  };

  const simulateDownloadTest = () => {
    return new Promise<void>((resolve) => {
      let current = 0;
      const target = vm.speedStats.download || Math.random() * 80 + 20;
      const interval = setInterval(() => {
        current += Math.random() * 15;
        if (current >= target) {
          current = target;
          clearInterval(interval);
          resolve();
        }
        setDisplaySpeed(current);
      }, 50);
    });
  };

  const simulateUploadTest = () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  };

  const simulatePingTest = () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  };

  const getTestStatusText = () => {
    switch (testPhase) {
      case 'download':
        return 'Testing Download...';
      case 'upload':
        return 'Testing Upload...';
      case 'ping':
        return 'Testing Ping...';
      case 'complete':
        return 'Complete!';
      default:
        return '';
    }
  };

  const displayValue = testing ? displaySpeed : vm.speedStats.download;

  return (
    <div className="flex flex-col h-full pt-6 px-6 bg-slate-900">
      <h2 className="text-xl font-bold text-white mb-8">Speed Test</h2>

      {/* Main Content Area - Similar to fast.com */}
      <div className="flex-grow flex flex-col items-center justify-center">
        
        {/* Large Speed Display */}
        <div className="text-center mb-12">
          <div className="text-7xl font-bold text-white mb-4 tracking-tight">
            {displayValue.toFixed(1)}
          </div>
          <div className="text-lg text-slate-400 uppercase tracking-widest">
            Mbps
          </div>
        </div>

        {/* Test Status or Button */}
        <div className="mb-12 min-h-12 flex items-center justify-center">
          {testing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-blue-400 text-sm tracking-widest animate-pulse font-medium">
                {getTestStatusText()}
              </div>
            </div>
          ) : (
            <button 
              onClick={handleTest}
              className={`px-16 py-4 rounded-lg font-bold text-lg tracking-widest transition-all ${
                vm.isConnected 
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {vm.isConnected ? 'START TEST' : 'CONNECT FIRST'}
            </button>
          )}
        </div>

        {/* Progress Indicators */}
        {testing && (
          <div className="flex gap-12 mb-8">
            <div className={`flex flex-col items-center ${testPhase === 'download' || testPhase === 'upload' || testPhase === 'ping' || testPhase === 'complete' ? 'opacity-100' : 'opacity-40'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-xs text-slate-400 uppercase">Download</span>
            </div>
            <div className={`flex flex-col items-center ${testPhase === 'upload' || testPhase === 'ping' || testPhase === 'complete' ? 'opacity-100' : 'opacity-40'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-xs text-slate-400 uppercase">Upload</span>
            </div>
            <div className={`flex flex-col items-center ${testPhase === 'ping' || testPhase === 'complete' ? 'opacity-100' : 'opacity-40'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs text-slate-400 uppercase">Ping</span>
            </div>
          </div>
        )}
      </div>

      {/* Results Grid - Only show when test is complete */}
      {!testing && (vm.speedStats.download > 0 || vm.speedStats.upload > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-slate-800 rounded-lg p-4 flex flex-col items-center border border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-white font-bold text-lg">{vm.speedStats.download.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 uppercase mt-1">Download</span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 flex flex-col items-center border border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-white font-bold text-lg">{vm.speedStats.upload.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 uppercase mt-1">Upload</span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 flex flex-col items-center border border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-white font-bold text-lg">{vm.speedStats.latency}</span>
            <span className="text-[10px] text-slate-500 uppercase mt-1">Ping</span>
          </div>
        </div>
      )}
    </div>
  );
};