import { VpnNode } from '../types';
import { MOCK_NODES } from '../constants';

// Simulates the Android VpnService & OkHttp interactions
export const mockVpnService = {
  
  async connect(node: VpnNode): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1500); // Simulate connection delay
    });
  },

  async disconnect(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 800);
    });
  },

  async fetchSubscription(url: string): Promise<VpnNode[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return simulated sorted list as per requirement
        const newNodes = [
          ...MOCK_NODES,
          { id: '99', name: 'Cloudflare Proxy A', protocol: 'vless', region: 'CA', flag: '🇨🇦', ping: 180, isPremium: false } as VpnNode
        ];
        // Requirement: "Sorted by node name"
        const sorted = newNodes.sort((a, b) => a.name.localeCompare(b.name));
        resolve(sorted);
      }, 1000);
    });
  },

  // Simulates the SpeedTest.kt logic
  async performSpeedTest(): Promise<{ download: number; upload: number; latency: number }> {
    return new Promise((resolve) => {
      // Simulate 3 seconds of testing
      setTimeout(() => {
        resolve({
          download: Math.floor(Math.random() * 80) + 20, // 20-100 Mbps
          upload: Math.floor(Math.random() * 30) + 5, // 5-35 Mbps
          latency: Math.floor(Math.random() * 50) + 30, // 30-80 ms
        });
      }, 3000);
    });
  }
};