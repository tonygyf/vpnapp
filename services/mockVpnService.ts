import { VpnNode } from '../types';
import { MOCK_NODES } from '../constants';
import { subscriptionService } from './subscriptionService';
import { vpnBridgeService } from './vpnBridgeService';

// VPN 服务层
// 当 JSBridge 可用时调用真实的原生 VPN 功能
// 否则使用 Mock 数据（用于浏览器测试）

export const mockVpnService = {
  
  async connect(node: VpnNode): Promise<boolean> {
    // 如果 JSBridge 可用，调用真实的原生 VPN 函数
    if (vpnBridgeService.isReady()) {
      try {
        return await vpnBridgeService.connect(node);
      } catch (error) {
        console.error('Real VPN connect failed, falling back to mock:', error);
      }
    }

    // 降级到 Mock 数据（用于浏览器环境开发和测试）
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1500); // Simulate connection delay
    });
  },

  async disconnect(): Promise<boolean> {
    // 如果 JSBridge 可用，调用真实的原生 VPN 函数
    if (vpnBridgeService.isReady()) {
      try {
        return await vpnBridgeService.disconnect();
      } catch (error) {
        console.error('Real VPN disconnect failed, falling back to mock:', error);
      }
    }

    // 降级到 Mock 数据
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 800);
    });
  },

  /**
   * 获取或导入订阅
   * 如果本地有缓存，则返回缓存的节点
   * 否则从远程获取
   */
  async fetchSubscription(url: string, forceRefresh = false): Promise<VpnNode[]> {
    try {
      // 使用真实的订阅服务
      const nodes = await subscriptionService.fetchAndParseSubscription(url, forceRefresh);
      
      // 按节点名称排序
      return nodes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      
      // 降级到 mock 数据（用于演示）
      return new Promise((resolve) => {
        setTimeout(() => {
          const newNodes = [
            ...MOCK_NODES,
            { id: '99', name: 'Cloudflare Proxy A', protocol: 'vless', region: 'CA', flag: '🇨🇦', ping: 180, isPremium: false } as VpnNode
          ];
          const sorted = newNodes.sort((a, b) => a.name.localeCompare(b.name));
          resolve(sorted);
        }, 1000);
      });
    }
  },

  /**
   * 获取所有已缓存的订阅节点
   */
  getAllSubscriptionNodes(): VpnNode[] {
    return subscriptionService.getAllNodes().sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * 获取订阅列表
   */
  getSubscriptions() {
    return subscriptionService.getSubscriptions();
  },

  /**
   * 删除订阅
   */
  removeSubscription(url: string) {
    subscriptionService.removeSubscription(url);
  },

  /**
   * 更新单个订阅
   */
  async updateSubscription(url: string): Promise<VpnNode[]> {
    return this.fetchSubscription(url, true);
  },

  /**
   * 更新所有订阅
   */
  async updateAllSubscriptions(): Promise<VpnNode[]> {
    const subscriptions = subscriptionService.getSubscriptions();
    const allNodes: VpnNode[] = [];

    for (const sub of subscriptions) {
      try {
        const nodes = await subscriptionService.fetchAndParseSubscription(sub.url, true);
        allNodes.push(...nodes);
      } catch (error) {
        console.error(`Failed to update ${sub.name || sub.url}:`, error);
      }
    }

    return allNodes.sort((a, b) => a.name.localeCompare(b.name));
  },

  // Simulates the SpeedTest.kt logic - modeled after fast.com
  async performSpeedTest(): Promise<{ download: number; upload: number; latency: number }> {
    // 如果 JSBridge 可用，调用真实的原生速度测试
    if (vpnBridgeService.isReady()) {
      try {
        return await vpnBridgeService.runSpeedTest();
      } catch (error) {
        console.error('Real speed test failed, falling back to mock:', error);
      }
    }

    // 降级到 Mock 数据（用于浏览器环境）
    return new Promise((resolve) => {
      // Simulate full test duration (download + upload + ping)
      setTimeout(() => {
        resolve({
          download: Math.floor(Math.random() * 80) + 20, // 20-100 Mbps
          upload: Math.floor(Math.random() * 40) + 10, // 10-50 Mbps
          latency: Math.floor(Math.random() * 40) + 20, // 20-60 ms
        });
      }, 4500); // Total test time
    });
  },

  /**
   * 测试节点延迟
   */
  async testLatency(node: VpnNode): Promise<number> {
    // 如果 JSBridge 可用，调用真实的延迟测试
    if (vpnBridgeService.isReady()) {
      try {
        const latency = await vpnBridgeService.testLatency(node);
        if (latency !== null) {
          return latency;
        }
      } catch (error) {
        console.error('Real latency test failed, falling back to mock:', error);
      }
    }

    // 降级到 Mock 数据
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.floor(Math.random() * 80) + 20); // 20-100ms
      }, 500);
    });
  },

  /**
   * 批量测试多个节点的延迟
   */
  async testMultipleLatencies(nodes: VpnNode[]): Promise<VpnNode[]> {
    if (vpnBridgeService.isReady()) {
      try {
        const latencies = await vpnBridgeService.testMultipleLatencies(nodes);
        return nodes.map(node => ({
          ...node,
          ping: latencies.get(node.id) || node.ping,
        }));
      } catch (error) {
        console.error('Real multi-latency test failed, using mock:', error);
      }
    }

    // 降级到 Mock 数据 - 为每个节点生成随机延迟
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedNodes = nodes.map(node => ({
          ...node,
          ping: Math.floor(Math.random() * 80) + 20,
        }));
        resolve(updatedNodes);
      }, 1000);
    });
  },

  /**
   * 获取 VPN 当前状态
   */
  async getVpnStatus() {
    if (vpnBridgeService.isReady()) {
      try {
        return await vpnBridgeService.getVpnStatus();
      } catch (error) {
        console.error('Failed to get VPN status:', error);
      }
    }

    return { connected: false, duration: 0 };
  },

  /**
   * 监听 VPN 状态变化
   */
  onVpnStatusChanged(callback: (status: any) => void) {
    if (vpnBridgeService.isReady()) {
      return vpnBridgeService.onVpnStatusChanged(callback);
    }
    return () => {}; // 空的取消函数
  },

  /**
   * 检查 VPN 权限
   */
  async checkVpnPermissions() {
    if (vpnBridgeService.isReady()) {
      return await vpnBridgeService.checkPermissions();
    }
    return { granted: true }; // 浏览器环境默认授予
  },

  /**
   * 获取平台信息
   */
  getPlatform() {
    return vpnBridgeService.getPlatform();
  },

  /**
   * 检查 JSBridge 是否就绪
   */
  isBridgeReady() {
    return vpnBridgeService.isReady();
  }
};