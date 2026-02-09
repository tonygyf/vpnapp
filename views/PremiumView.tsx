import React, { useState } from 'react';
import { VpnViewModel } from '../types';

interface Props {
  vm: VpnViewModel;
}

export const PremiumView: React.FC<Props> = ({ vm }) => {
  const [processing, setProcessing] = useState(false);

  const handlePay = async (method: 'wechat' | 'alipay') => {
    setProcessing(true);
    await vm.purchasePremium(method);
    setProcessing(false);
  };

  if (vm.isPremium) {
    return (
        <div className="flex flex-col h-full items-center justify-center p-6 bg-slate-900 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0v-1H3a1 1 0 010-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V6H9a1 1 0 010-2h1V3a1 1 0 011-1z" clipRule="evenodd" />
                    <path d="M11.293 3.293a1 1 0 011.414 0l6 6 2 2a1 1 0 01-1.414 1.414L19 12.414V19a2 2 0 01-2 2h-3a1 1 0 01-1-1v-3h-2v3a1 1 0 01-1 1H7a2 2 0 01-2-2v-6.586l-.293.293a1 1 0 01-1.414-1.414l2-2 6-6z" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Premium Active</h2>
            <p className="text-slate-400 mb-8">Thank you for your support! You have access to all high-speed nodes and zero ads.</p>
            <div className="w-full max-w-sm bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Status</span>
                    <span className="text-emerald-400 font-bold">Active</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-3">
                    <span className="text-slate-400">Next Billing</span>
                    <span className="text-white">Lifetime</span>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-y-auto">
      <div className="relative h-64 bg-gradient-to-br from-indigo-600 to-blue-800 p-6 flex flex-col justify-end">
        <h1 className="text-3xl font-bold text-white mb-2">Upgrade to Pro</h1>
        <p className="text-blue-100 text-sm">Unlock faster speeds, more servers, and remove ads.</p>
        
        {/* Abstract circles decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-400/20 rounded-full blur-xl"></div>
      </div>

      <div className="flex-1 p-6 -mt-8">
        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
            <ul className="space-y-4 mb-8">
                {[
                    'Access to Premium IPLC Nodes',
                    'Streaming Support (Netflix/Disney+)',
                    'Ad-Free Experience',
                    'Priority Support'
                ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-slate-200 text-sm">{item}</span>
                    </li>
                ))}
            </ul>

            <div className="text-center mb-6">
                <span className="text-3xl font-bold text-white">¥15.00</span>
                <span className="text-slate-400 text-sm"> / Month</span>
            </div>

            {processing ? (
                 <div className="w-full py-4 flex items-center justify-center text-white">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing Payment...
                 </div>
            ) : (
                <div className="space-y-3">
                    <button 
                        onClick={() => handlePay('alipay')}
                        className="w-full py-3 bg-[#1677FF] hover:bg-[#4096ff] rounded-lg text-white font-medium flex items-center justify-center gap-2 transition"
                    >
                        <span>Alipay 支付宝</span>
                    </button>
                    <button 
                        onClick={() => handlePay('wechat')}
                        className="w-full py-3 bg-[#07C160] hover:bg-[#38cd7f] rounded-lg text-white font-medium flex items-center justify-center gap-2 transition"
                    >
                        <span>WeChat Pay 微信支付</span>
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};