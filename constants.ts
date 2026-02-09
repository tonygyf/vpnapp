import { VpnNode } from './types';

export const MOCK_NODES: VpnNode[] = [
  { id: '1', name: 'Hong Kong Node A', protocol: 'vmess', region: 'HK', flag: '🇭🇰', ping: 45, isPremium: false },
  { id: '2', name: 'Japan HighSpeed 1', protocol: 'vless', region: 'JP', flag: '🇯🇵', ping: 80, isPremium: false },
  { id: '3', name: 'Singapore Direct', protocol: 'vmess', region: 'SG', flag: '🇸🇬', ping: 95, isPremium: false },
  { id: '4', name: 'US West Coast', protocol: 'trojan', region: 'US', flag: '🇺🇸', ping: 160, isPremium: false },
  { id: '5', name: 'Korea Low Latency', protocol: 'vmess', region: 'KR', flag: '🇰🇷', ping: 70, isPremium: true },
  { id: '6', name: 'London Streaming', protocol: 'vmess', region: 'UK', flag: '🇬🇧', ping: 210, isPremium: true },
];

export const COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#8b5cf6', // violet-500
  success: '#10b981', // emerald-500
  error: '#ef4444', // red-500
  background: '#0f172a', // slate-900
};