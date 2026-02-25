import { VpnNode } from '../types';
import { parseSubscriptionLink } from './protocolParser';

/**
 * 订阅服务
 * 负责获取、解析、缓存订阅内容
 */

interface SubscriptionInfo {
  url: string;
  lastUpdate: number; // 时间戳
  nodes: VpnNode[];
  name?: string;
}

const STORAGE_KEY = 'vpn_subscriptions';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

export const subscriptionService = {
  /**
   * 获取所有已保存的订阅
   */
  getSubscriptions(): SubscriptionInfo[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * 保存订阅
   */
  saveSubscription(info: SubscriptionInfo): void {
    const subs = this.getSubscriptions();
    const index = subs.findIndex(s => s.url === info.url);
    if (index > -1) {
      subs[index] = info;
    } else {
      subs.push(info);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  },

  /**
   * 覆盖订阅（清除其他订阅，仅保留该订阅）
   * 用于自动更新时替换节点列表
   */
  overrideSubscriptions(info: SubscriptionInfo): void {
    // 仅保留要覆盖的订阅
    localStorage.setItem(STORAGE_KEY, JSON.stringify([info]));
  },

  /**
   * 删除订阅
   */
  removeSubscription(url: string): void {
    const subs = this.getSubscriptions().filter(s => s.url !== url);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  },

  /**
   * 从订阅中删除单个节点
   */
  removeNode(nodeId: string): void {
    const subs = this.getSubscriptions();
    let changed = false;
    
    for (const sub of subs) {
      const originLength = sub.nodes.length;
      sub.nodes = sub.nodes.filter(n => n.id !== nodeId);
      if (sub.nodes.length < originLength) {
        changed = true;
      }
    }
    
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    }
  },

  /**
   * 清空所有节点列表
   */
  clearAllNodes(): void {
    const subs = this.getSubscriptions();
    for (const sub of subs) {
      sub.nodes = [];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  },

  /**
   * 从 URL 获取并解析订阅
   */
  async fetchAndParseSubscription(url: string, forceRefresh = false): Promise<VpnNode[]> {
    try {
      const requestUrls: string[] = [];
      try {
        const u = new URL(url);
        if (u.hostname === 'vpn.gyf123.dpdns.org') {
          requestUrls.push('/sub' + u.search);
          requestUrls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
          requestUrls.push(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        }
        requestUrls.push(url);
      } catch {
        requestUrls.push(url);
      }

      // 检查缓存
      const subs = this.getSubscriptions();
      const existing = subs.find(s => s.url === url);
      
      if (existing && !forceRefresh && Date.now() - existing.lastUpdate < CACHE_DURATION) {
        console.log('Using cached subscription for:', url);
        return existing.nodes;
      }

      let response: Response | null = null;
      let lastError: unknown = null;
      for (const requestUrl of requestUrls) {
        try {
          console.log('Fetching subscription from:', requestUrl);
          response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'V2Ray VPN App',
            },
            cache: 'no-cache',
          });
          if (response.ok) {
            break;
          }
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (e) {
          lastError = e;
        }
      }

      if (!response) {
        throw lastError || new Error('Failed to fetch subscription');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let content = await response.text();

      // 尝试 base64 解码（v2ray 订阅通常是 base64 编码的）
      try {
        content = atob(content);
      } catch (e) {
        // 如果不是 base64，直接使用原内容
        console.log('Content is not base64 encoded, using as-is');
      }

      // 按行分割，过滤并解析每个节点
      const lines = content.split('\n').filter(line => line.trim());
      const nodes: VpnNode[] = [];

      for (const line of lines) {
        const node = parseSubscriptionLink(line.trim());
        if (node) {
          nodes.push(node);
        }
      }

      if (nodes.length === 0) {
        throw new Error('No valid nodes found in subscription');
      }

      // 保存到本地存储
      const subInfo: SubscriptionInfo = {
        url,
        lastUpdate: Date.now(),
        nodes,
        name: extractSubscriptionName(url),
      };
      this.saveSubscription(subInfo);

      console.log(`Successfully parsed ${nodes.length} nodes from subscription`);
      return nodes;
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      throw error;
    }
  },

  /**
   * 合并多个订阅的节点
   */
  mergeSubscriptions(urls: string[]): VpnNode[] {
    const subs = this.getSubscriptions();
    const allNodes: VpnNode[] = [];

    for (const url of urls) {
      const sub = subs.find(s => s.url === url);
      if (sub) {
        allNodes.push(...sub.nodes);
      }
    }

    // 去重（基于 id）
    const uniqueMap = new Map<string, VpnNode>();
    for (const node of allNodes) {
      if (!uniqueMap.has(node.id)) {
        uniqueMap.set(node.id, node);
      }
    }

    return Array.from(uniqueMap.values());
  },

  /**
   * 检查是否需要更新订阅（超过24小时）
   */
  needsUpdate(url: string): boolean {
    const subs = this.getSubscriptions();
    const sub = subs.find(s => s.url === url);
    if (!sub) return true;
    return Date.now() - sub.lastUpdate >= CACHE_DURATION;
  },

  /**
   * 获取所有订阅中的节点列表
   */
  getAllNodes(): VpnNode[] {
    const subs = this.getSubscriptions();
    const allNodes: VpnNode[] = [];
    
    for (const sub of subs) {
      allNodes.push(...sub.nodes);
    }

    return allNodes;
  },

  updateNodePing(nodeId: string, ping: number): void {
    const subs = this.getSubscriptions();
    let changed = false;
    for (const sub of subs) {
      for (const node of sub.nodes) {
        if (node.id === nodeId) {
          node.ping = ping;
          changed = true;
        }
      }
    }
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    }
  },
};

/**
 * 从 URL 中提取订阅名称
 */
function extractSubscriptionName(url: string): string {
  try {
    const urlObj = new URL(url);
    // 尝试从路径获取
    const lastPart = urlObj.pathname.split('/').pop();
    if (lastPart && lastPart.length > 0) {
      return decodeURIComponent(lastPart);
    }
    // 尝试从主机名获取
    return urlObj.hostname;
  } catch {
    return url;
  }
}
