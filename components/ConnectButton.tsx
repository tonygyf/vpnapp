import React from 'react';
import { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
  onClick: () => void;
  duration: number;
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const ConnectButton: React.FC<Props> = ({ status, onClick, duration }) => {
  const isConnected = status === 'CONNECTED';
  const isConnecting = status === 'CONNECTING' || status === 'DISCONNECTING';

  return (
    <div className="relative flex flex-col items-center justify-center my-8">
      {/* Outer Glow/Ripple - 放大 + 再向上 */}
      <div 
        className={`absolute w-[230px] h-[230px] rounded-full transition-all duration-1000 left-1/2 top-[-42px] -translate-x-1/2 -translate-y-1/2${
        isConnected ? 'bg-emerald-500/20 scale-125 animate-pulse' : 
        isConnecting ? 'bg-yellow-500/20 scale-110 animate-pulse' :
        'bg-blue-500/10 scale-100'
    }`} 
/>
      
      {/* Inner Glow */}
      <div className={`absolute w-40 h-40 rounded-full transition-all duration-700 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
         isConnected ? 'bg-emerald-500/30 blur-xl' : 
         isConnecting ? 'bg-yellow-500/30 blur-xl' :
         'bg-blue-600/20 blur-xl'
      }`} />

      {/* Button Body */}
      <button
        onClick={onClick}
        disabled={isConnecting}
        className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 transform active:scale-95 border-4 ${
          isConnected 
            ? 'bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-400' 
            : isConnecting
            ? 'bg-gradient-to-br from-yellow-500 to-orange-600 border-yellow-400'
            : 'bg-gradient-to-br from-blue-600 to-indigo-800 border-blue-400 group hover:shadow-blue-500/50'
        }`}
      >
        <div className="text-white drop-shadow-md">
          {isConnected ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mb-1 ${isConnecting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </div>
        
        <span className="text-white font-bold tracking-widest text-sm uppercase">
          {status === 'CONNECTED' ? 'STOP' : status === 'CONNECTING' ? 'WAIT' : 'START'}
        </span>
      </button>

      {/* Status Text / Timer */}
      <div className="mt-8 text-center h-12">
        {isConnected ? (
          <div className="flex flex-col animate-fade-in">
            <span className="text-emerald-400 font-semibold tracking-wider text-lg">VPN PROTECTED</span>
            <span className="text-slate-400 font-mono text-sm">{formatDuration(duration)}</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className={`font-semibold tracking-wider text-lg ${isConnecting ? 'text-yellow-400' : 'text-slate-300'}`}>
              {status === 'DISCONNECTED' ? 'TAP TO CONNECT' : status.replace('_', ' ')}
            </span>
            <span className="text-slate-500 text-sm">
               {selectedNodeName(status) || 'Secure & Fast'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const selectedNodeName = (status: string) => {
  // Helper to show context if needed
  return null; 
}
