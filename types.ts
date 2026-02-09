export interface VpnNode {
  id: string;
  name: string;
  protocol: 'vmess' | 'vless' | 'trojan';
  region: string;
  flag: string; // Emoji flag
  ping: number; // ms
  isPremium: boolean;
}

export interface SpeedStats {
  download: number; // Mbps
  upload: number; // Mbps
  latency: number; // ms
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING';

// MVVM State Interface
export interface VpnViewModel {
  status: ConnectionStatus;
  selectedNode: VpnNode | null;
  nodes: VpnNode[];
  speedStats: SpeedStats;
  isConnected: boolean;
  isPremium: boolean;
  duration: number; // seconds connected
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  selectNode: (node: VpnNode) => void;
  importSubscription: (url: string) => Promise<boolean>;
  runSpeedTest: () => Promise<void>;
  purchasePremium: (method: 'wechat' | 'alipay') => Promise<void>;
}