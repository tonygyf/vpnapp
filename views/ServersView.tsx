import React, { useState } from 'react';
import { VpnViewModel } from '../types';
import { DEFAULT_SUBSCRIPTION_URL } from '../constants';

interface Props {
  vm: VpnViewModel;
}

export const ServersView: React.FC<Props> = ({ vm }) => {
  const [showSubInput, setShowSubInput] = useState(false);
  const [subUrl, setSubUrl] = useState(DEFAULT_SUBSCRIPTION_URL);

  const handleImport = async () => {
    if(!subUrl) return;
    const success = await vm.importSubscription(subUrl);
    if(success) {
        setShowSubInput(false);
        setSubUrl('');
    } else {
        alert("Failed to parse subscription");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 pt-6">
      {/* Header */}
      <div className="px-6 pb-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Locations</h2>
        <button 
            onClick={() => setShowSubInput(!showSubInput)}
            className="text-blue-400 text-sm font-medium hover:text-blue-300"
        >
            + Add Sub
        </button>
      </div>

      {/* Subscription Input */}
      {showSubInput && (
        <div className="p-4 bg-slate-800 animate-slide-in-top">
            <input 
                type="text" 
                placeholder="Paste subscription URL (Cloudflare Tunnel)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 mb-2"
                value={subUrl}
                onChange={(e) => setSubUrl(e.target.value)}
            />
            <button 
                onClick={handleImport}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition"
            >
                Import Nodes
            </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {vm.nodes.map((node) => {
            const isSelected = vm.selectedNode?.id === node.id;
            return (
                <div 
                    key={node.id}
                    onClick={() => vm.selectNode(node)}
                    className={`group flex items-center justify-between p-4 mb-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                        ? 'bg-blue-600/10 border-blue-500/50' 
                        : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">{node.flag}</span>
                        <div>
                            <h3 className={`font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                                {node.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">
                                    {node.protocol}
                                </span>
                                {node.isPremium && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 uppercase font-bold">
                                        PRO
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 ${
                            node.ping < 100 ? 'text-emerald-400' : node.ping < 200 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                            <span className="text-xs font-mono">{node.ping}ms</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-500' : 'border-slate-600'
                        }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
