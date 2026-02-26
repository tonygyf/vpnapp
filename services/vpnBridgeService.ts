/**
 * VPN Bridge 服务
 * 提供对原生 VPN 功能的调用接口
 * 所有 VPN 操作都通过这个服务传递到原生代码
 */

import { jsbridge } from './jsbridge';
import { VpnNode } from '../types';

export interface VpnConnectionConfig {
  node: VpnNode;
  // 额外的连接配置可以从 node._raw 中获取
}

export interface VpnStatus {
  connected: boolean;
  currentNode?: VpnNode;
  duration: number; // 连接持续时间（秒）
  bytesTransferred?: {
    upload: number;
    download: number;
  };
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
}

export interface PingTestResult {
  node: VpnNode;
  latency: number; // ms
  success: boolean;
}

/**
 * VPN Bridge 服务
 * 通过 JSBridge 调用原生 VPN 功能
 */
class VpnBridgeService {
  private static instance: VpnBridgeService;

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): VpnBridgeService {
    if (!VpnBridgeService.instance) {
      VpnBridgeService.instance = new VpnBridgeService();
    }
    return VpnBridgeService.instance;
  }

  /**
   * 设置事件监听器
   * 监听原生代码发送的 VPN 事件
   */
  private setupEventListeners() {
    // VPN 连接状态变化
    jsbridge.on('vpn-status-changed', (data) => {
      console.log('VPN status changed:', data);
    });

    // VPN 错误
    jsbridge.on('vpn-error', (data) => {
      console.error('VPN error:', data);
    });

    // 权限请求结果
    jsbridge.on('permission-result', (data) => {
      console.log('Permission result:', data);
    });

    // Bridge 就绪
    jsbridge.on('bridge-ready', () => {
      console.log('VPN Bridge ready');
    });
  }

  /**
   * 检查 VPN 权限
   */
  async checkPermissions(): Promise<PermissionResult> {
    try {
      const result = await jsbridge.call('native.checkVpnPermissions', {});
      return result as PermissionResult;
    } catch (error) {
      console.error('Failed to check VPN permissions:', error);
      return { granted: false, reason: String(error) };
    }
  }

  /**
   * 请求 VPN 权限
   */
  async requestPermissions(): Promise<PermissionResult> {
    try {
      const result = await jsbridge.call('native.requestVpnPermissions', {});
      return result as PermissionResult;
    } catch (error) {
      console.error('Failed to request VPN permissions:', error);
      return { granted: false, reason: String(error) };
    }
  }

  /**
   * 连接到 VPN 节点
   * @param node VPN 节点信息
   */
  async connect(node: VpnNode): Promise<boolean> {
    try {
      // 首先检查权限
      const permission = await this.checkPermissions();
      if (!permission.granted) {
        console.log('VPN permission not granted, requesting...');
        const requestResult = await this.requestPermissions();
        if (!requestResult.granted) {
          throw new Error('VPN permission denied');
        }
      }

      // 准备连接配置
      const config = {
        id: node.id,
        name: node.name,
        protocol: node.protocol,
        config: node._raw, // 原始配置数据
        disallowApps: (() => {
          try {
            const raw = localStorage.getItem('vpn_disallow_apps');
            if (raw) return JSON.parse(raw);
          } catch {}
          return ['com.google.android.youtube'];
        })(),
      };

      // 调用原生连接方法
      const result = await jsbridge.call('native.vpn.connect', config);

      if (result.success) {
        console.log('Connected to VPN node:', node.name);
        return true;
      } else {
        throw new Error(result.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('VPN connection failed:', error);
      throw error;
    }
  }

  /**
   * 断开 VPN 连接
   */
  async disconnect(): Promise<boolean> {
    try {
      const result = await jsbridge.call('native.vpn.disconnect', {});

      if (result.success) {
        console.log('Disconnected from VPN');
        return true;
      } else {
        throw new Error(result.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('VPN disconnection failed:', error);
      throw error;
    }
  }

  /**
   * 获取当前 VPN 状态
   */
  async getVpnStatus(): Promise<VpnStatus> {
    try {
      const result = await jsbridge.call('native.vpn.getStatus', {});
      return result as VpnStatus;
    } catch (error) {
      console.error('Failed to get VPN status:', error);
      return {
        connected: false,
        duration: 0,
      };
    }
  }

  /**
   * 测试节点延迟（Ping）
   * @param node VPN 节点
   */
  async testLatency(node: VpnNode): Promise<number | null> {
    try {
      const result = await jsbridge.call('native.vpn.testLatency', {
        id: node.id,
        config: node._raw,
      });

      if (result.success) {
        return result.latency;
      } else {
        console.warn(`Failed to test latency for ${node.name}:`, result.error);
        return null;
      }
    } catch (error) {
      console.error('Latency test failed:', error);
      return null;
    }
  }

  /**
   * 批量测试节点延迟
   * @param nodes VPN 节点数组
   */
  async testMultipleLatencies(nodes: VpnNode[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    for (const node of nodes) {
      const latency = await this.testLatency(node);
      if (latency !== null) {
        results.set(node.id, latency);
      }
    }

    return results;
  }

  /**
   * 运行速度测试
   * 返回下载速度、上传速度和延迟
   */
  async runSpeedTest(testUrl: string): Promise<{ download: number; upload: number; latency: number }> {
    try {
      const result = await jsbridge.call('native.vpn.speedTest', { url: testUrl });

      if (result.success) {
        return {
          download: result.download,
          upload: result.upload,
          latency: result.latency,
        };
      } else {
        throw new Error(result.error || 'Speed test failed');
      }
    } catch (error) {
      console.error('Speed test failed:', error);
      throw error;
    }
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<Record<string, any>> {
    try {
      const result = await jsbridge.call('native.getSystemInfo', {});
      return result;
    } catch (error) {
      console.error('Failed to get system info:', error);
      return {};
    }
  }

  /**
   * 监听 VPN 连接状态变化
   */
  onVpnStatusChanged(callback: (status: VpnStatus) => void): () => void {
    return jsbridge.on('vpn-status-changed', callback);
  }

  /**
   * 监听 VPN 错误
   */
  onVpnError(callback: (error: { code: string; message: string }) => void): () => void {
    return jsbridge.on('vpn-error', callback);
  }

  /**
   * 监听连接时长更新
   */
  onDurationUpdate(callback: (duration: number) => void): () => void {
    return jsbridge.on('vpn-duration-update', callback);
  }

  /**
   * 监听流量统计更新
   */
  onTrafficUpdate(
    callback: (traffic: { upload: number; download: number }) => void
  ): () => void {
    return jsbridge.on('vpn-traffic-update', callback);
  }

  /**
   * 检查 JSBridge 是否就绪
   */
  isReady(): boolean {
    return jsbridge.isReady();
  }

  /**
   * 获取平台
   */
  getPlatform(): 'android' | 'ios' | 'web' {
    return jsbridge.getPlatform();
  }
}

export const vpnBridgeService = VpnBridgeService.getInstance();
