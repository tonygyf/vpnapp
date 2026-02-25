/**
 * 权限管理服务
 * 管理应用所需的系统权限（VPN、网络等）
 */

import { vpnBridgeService } from './vpnBridgeService';

export interface PermissionStatus {
  vpn: boolean;
  network: boolean;
  storage: boolean;
  allGranted: boolean;
}

class PermissionManager {
  private static instance: PermissionManager;
  private cachedPermissions: Partial<PermissionStatus> = {};

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * 请求 VPN 权限
   */
  async requestVpnPermission(): Promise<boolean> {
    if (!vpnBridgeService.isReady()) {
      console.warn('JSBridge not ready for VPN permission request');
      return true; // 浏览器环境默认返回 true
    }

    try {
      const result = await vpnBridgeService.requestPermissions();
      this.cachedPermissions.vpn = result.granted;
      return result.granted;
    } catch (error) {
      console.error('VPN permission request failed:', error);
      return false;
    }
  }

  /**
   * 检查 VPN 权限
   */
  async checkVpnPermission(): Promise<boolean> {
    if (this.cachedPermissions.vpn !== undefined) {
      return this.cachedPermissions.vpn;
    }

    if (!vpnBridgeService.isReady()) {
      console.warn('JSBridge not ready for VPN permission check');
      return true;
    }

    try {
      const result = await vpnBridgeService.checkPermissions();
      this.cachedPermissions.vpn = result.granted;
      return result.granted;
    } catch (error) {
      console.error('VPN permission check failed:', error);
      return false;
    }
  }

  /**
   * 获取所有必需的权限状态
   */
  async getAllPermissions(): Promise<PermissionStatus> {
    const vpnGranted = await this.checkVpnPermission();

    const status: PermissionStatus = {
      vpn: vpnGranted,
      network: true, // 网络权限通常与应用一起授予
      storage: true, // 存储权限通常与应用一起授予
      allGranted: vpnGranted,
    };

    return status;
  }

  /**
   * 请求所有必需的权限
   */
  async requestAllPermissions(): Promise<PermissionStatus> {
    const vpnGranted = await this.requestVpnPermission();

    const status: PermissionStatus = {
      vpn: vpnGranted,
      network: true,
      storage: true,
      allGranted: vpnGranted,
    };

    return status;
  }

  /**
   * 清除缓存的权限信息
   * 当用户手动更改权限时调用
   */
  clearCache(): void {
    this.cachedPermissions = {};
  }

  /**
   * 检查是否为原生 App 环境
   */
  isNativeApp(): boolean {
    return vpnBridgeService.isReady();
  }

  /**
   * 获取当前平台
   */
  getPlatform(): 'android' | 'ios' | 'web' {
    return vpnBridgeService.getPlatform();
  }
}

export const permissionManager = PermissionManager.getInstance();
