import { useEffect, useCallback, useRef } from 'react';
import { vpnBridgeService } from '../services/vpnBridgeService';
import { permissionManager } from '../services/permissionManager';
import { VpnNode } from '../types';

/**
 * VPN Bridge Hook
 * 提供对原生 VPN 功能的 React Hook 封装
 */

export const useVpnBridge = () => {
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // 连接到 VPN 节点
  const connect = useCallback(async (node: VpnNode): Promise<boolean> => {
    try {
      // 检查权限
      const permission = await permissionManager.checkVpnPermission();
      if (!permission) {
        const requested = await permissionManager.requestVpnPermission();
        if (!requested) {
          throw new Error('VPN permission denied');
        }
      }

      // 连接
      return await vpnBridgeService.connect(node);
    } catch (error) {
      console.error('Connect failed:', error);
      throw error;
    }
  }, []);

  // 断开 VPN 连接
  const disconnect = useCallback(async (): Promise<boolean> => {
    try {
      return await vpnBridgeService.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
      throw error;
    }
  }, []);

  // 获取 VPN 状态
  const getStatus = useCallback(async () => {
    return await vpnBridgeService.getVpnStatus();
  }, []);

  // 测试节点延迟
  const testLatency = useCallback(async (node: VpnNode): Promise<number | null> => {
    return await vpnBridgeService.testLatency(node);
  }, []);

  // 批量测试延迟
  const testMultipleLatencies = useCallback(async (nodes: VpnNode[]) => {
    return await vpnBridgeService.testMultipleLatencies(nodes);
  }, []);

  // 运行速度测试
  const runSpeedTest = useCallback(async () => {
    return await vpnBridgeService.runSpeedTest();
  }, []);

  // 检查 VPN 权限
  const checkPermission = useCallback(async () => {
    return await permissionManager.checkVpnPermission();
  }, []);

  // 请求 VPN 权限
  const requestPermission = useCallback(async () => {
    return await permissionManager.requestVpnPermission();
  }, []);

  // 监听 VPN 状态变化
  const onStatusChanged = useCallback((callback: (status: any) => void) => {
    const unsubscribe = vpnBridgeService.onVpnStatusChanged(callback);
    unsubscribersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // 监听 VPN 错误
  const onError = useCallback((callback: (error: any) => void) => {
    const unsubscribe = vpnBridgeService.onVpnError(callback);
    unsubscribersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // 监听连接时长更新
  const onDurationUpdate = useCallback((callback: (duration: number) => void) => {
    const unsubscribe = vpnBridgeService.onDurationUpdate(callback);
    unsubscribersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // 监听流量更新
  const onTrafficUpdate = useCallback((callback: (traffic: any) => void) => {
    const unsubscribe = vpnBridgeService.onTrafficUpdate(callback);
    unsubscribersRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // 清理：卸载组件时取消所有事件监听
  useEffect(() => {
    return () => {
      unsubscribersRef.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
      unsubscribersRef.current = [];
    };
  }, []);

  // 检查 Bridge 是否就绪
  const isReady = useCallback(() => {
    return vpnBridgeService.isReady();
  }, []);

  // 获取平台信息
  const getPlatform = useCallback(() => {
    return vpnBridgeService.getPlatform();
  }, []);

  return {
    // 核心操作
    connect,
    disconnect,
    getStatus,

    // 测试
    testLatency,
    testMultipleLatencies,
    runSpeedTest,

    // 权限
    checkPermission,
    requestPermission,

    // 事件监听
    onStatusChanged,
    onError,
    onDurationUpdate,
    onTrafficUpdate,

    // 状态检查
    isReady,
    getPlatform,
  };
};
