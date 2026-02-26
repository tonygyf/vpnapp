export interface VpnNode {
  id: string;
  name: string;
  protocol: 'vmess' | 'vless' | 'trojan';
  region: string;
  flag: string; // Emoji flag
  ping: number; // ms
  isPremium: boolean;
  _raw?: any; // 原始协议配置数据
}

export interface Subscription {
  url: string;
  name?: string;
  lastUpdate: number;
  nodes: VpnNode[];
}

export interface AppEnvironment {
  isNativeApp: boolean; // 是否运行在原生 App 中
  platform: 'android' | 'ios' | 'web'; // 运行平台
  appVersion?: string;
  osVersion?: string;
}

export interface SpeedStats {
  download: number; // Mbps
  upload: number; // Mbps
  latency: number; // ms
}

export interface TrafficPoint {
  time: number;
  upload: number;
  download: number;
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING';

// MVVM State Interface
export interface VpnViewModel {
  status: ConnectionStatus;
  selectedNode: VpnNode | null;
  nodes: VpnNode[];
  speedStats: SpeedStats;
  trafficHistory: TrafficPoint[];
  isConnected: boolean;
  isPremium: boolean;
  duration: number; // seconds connected
  subscriptions: Subscription[]; // 已添加的订阅列表
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  selectNode: (node: VpnNode) => void;
  importSubscription: (url: string, forceRefresh?: boolean) => Promise<{ success: boolean; error?: string; count?: number }>;
  removeSubscription: (url: string) => void;
  deleteNode: (nodeId: string) => void;  // 删除单个节点
  updateAllSubscriptions: () => Promise<void>;
  runSpeedTest: (testUrl: string) => Promise<void>;
  purchasePremium: (method: 'wechat' | 'alipay') => Promise<void>;
}
