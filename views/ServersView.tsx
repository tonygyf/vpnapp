import React, { useEffect, useRef, useState } from 'react';
import { VpnViewModel } from '../types';
import { DEFAULT_SUBSCRIPTION_URL } from '../constants';

interface Props {
  vm: VpnViewModel;
}

export const ServersView: React.FC<Props> = ({ vm }) => {
  const [showSubInput, setShowSubInput] = useState(false);
  const [subUrl, setSubUrl] = useState(DEFAULT_SUBSCRIPTION_URL);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleImport = async () => {
    if(!subUrl) return;
    const result = await vm.importSubscription(subUrl);
    if(result.success) {
        setShowSubInput(false);
        setSubUrl(DEFAULT_SUBSCRIPTION_URL);
        setToast({ type: 'success', message: `导入成功：${result.count || 0} 个节点` });
    } else {
        const reason = result.error || 'Failed to parse subscription';
        setToast({ type: 'error', message: `导入失败：${reason}` });
    }
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 pt-6">
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
          <div className={`px-4 py-2 rounded-lg text-sm font-medium border ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-red-500/20 text-red-300 border-red-500/40'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
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
                    className={`group flex items-center justify-between p-4 mb-3 rounded-xl border transition-all ${
                        isSelected 
                        ? 'bg-blue-600/10 border-blue-500/50' 
                        : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                    }`}
                >
                    <div 
                        onClick={() => vm.selectNode(node)}
                        className="flex-1 flex items-center gap-4 cursor-pointer"
                    >
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
                        
                        {/* Delete Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${node.name}"?`)) {
                                    vm.deleteNode(node.id);
                                    setToast({ type: 'success', message: `已删除: ${node.name}` });
                                    if (toastTimerRef.current) {
                                      window.clearTimeout(toastTimerRef.current);
                                    }
                                    toastTimerRef.current = window.setTimeout(() => {
                                      setToast(null);
                                    }, 2000);
                                }
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                            title="Delete node"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
