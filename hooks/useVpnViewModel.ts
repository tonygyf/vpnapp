import { useState, useEffect, useCallback, useRef } from 'react';
import { VpnViewModel, ConnectionStatus, VpnNode, SpeedStats, Subscription, TrafficPoint } from '../types';
import { mockVpnService } from '../services/mockVpnService';
import { subscriptionService } from '../services/subscriptionService';
import { vpnBridgeService } from '../services/vpnBridgeService';
import { permissionManager } from '../services/permissionManager';
import { useAutoUpdateSubscriptions } from './useAutoUpdateSubscriptions';
import { MOCK_NODES, DEFAULT_SUBSCRIPTION_URL } from '../constants';

export const useVpnViewModel = (): VpnViewModel => {
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [nodes, setNodes] = useState<VpnNode[]>(MOCK_NODES.sort((a, b) => a.name.localeCompare(b.name)));
  const [selectedNode, setSelectedNode] = useState<VpnNode | null>(MOCK_NODES[0] || null);
  const [speedStats, setSpeedStats] = useState<SpeedStats>({ download: 0, upload: 0, latency: 0 });
  const [trafficHistory, setTrafficHistory] = useState<TrafficPoint[]>(() => {
    try {
      const stored = localStorage.getItem('vpn_traffic_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isPremium, setIsPremium] = useState(false);
  const [duration, setDuration] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isUpdatingSubscriptions, setIsUpdatingSubscriptions] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  const trafficUnsubscribeRef = useRef<(() => void) | null>(null);

  // 自动更新订阅
  const { updateAllSubscriptions: autoUpdateSubscriptions } = useAutoUpdateSubscriptions(
    () => {
      // 更新完成后刷新节点列表
      refreshNodeList();
    }
  );

  // 初始化：检查 App 环境
  useEffect(() => {
    const isApp = vpnBridgeService.isReady();
    setIsNativeApp(isApp);

    if (isApp) {
      console.log(`App environment detected: ${vpnBridgeService.getPlatform()}`);
      
      // 监听原生 VPN 状态变化
      statusUnsubscribeRef.current = vpnBridgeService.onVpnStatusChanged((status) => {
        // 同步本地状态
        if (status.connected) {
          setStatus('CONNECTED');
          setDuration(status.duration || 0);
        } else {
          setStatus('DISCONNECTED');
          setDuration(0);
          setTrafficHistory([]);
          try {
            localStorage.removeItem('vpn_traffic_history');
          } catch {}
        }
      });

      // 监听实时流量事件
      trafficUnsubscribeRef.current = vpnBridgeService.onTrafficUpdate((traffic) => {
        setTrafficHistory(prev => {
          const next = [...prev, { time: Date.now(), upload: traffic.upload, download: traffic.download }];
          const trimmed = next.length > 120 ? next.slice(next.length - 120) : next;
          try {
            localStorage.setItem('vpn_traffic_history', JSON.stringify(trimmed));
          } catch {}
          return trimmed;
        });
      });
    }

    return () => {
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
      }
      if (trafficUnsubscribeRef.current) {
        trafficUnsubscribeRef.current();
      }
    };
  }, []);

  // 刷新节点列表
  const refreshNodeList = useCallback(() => {
    const allNodes = mockVpnService.getAllSubscriptionNodes();
    if (allNodes.length > 0) {
      setNodes(allNodes);
      // 如果当前选中的节点不在列表中，选择第一个
      if (!selectedNode || !allNodes.find(n => n.id === selectedNode.id)) {
        setSelectedNode(allNodes[0]);
      }
    } else {
      // 没有订阅时使用 mock 数据
      setNodes(MOCK_NODES.sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedNode(MOCK_NODES[0] || null);
    }
  }, [selectedNode]);

  // 初始化：加载已保存的订阅和节点
  useEffect(() => {
    const savedSubs = mockVpnService.getSubscriptions();
    setSubscriptions(savedSubs);
    
    // 如果有订阅，加载其节点
    if (savedSubs.length > 0) {
      refreshNodeList();
    }
  }, [refreshNodeList]);

  const autoImportTriedRef = useRef(false);

  useEffect(() => {
    if (status === 'CONNECTED') {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const connect = useCallback(async () => {
    if (!selectedNode) return;
    setStatus('CONNECTING');
    try {
      // 检查权限（如果在 App 中）
      if (isNativeApp) {
        const hasPermission = await permissionManager.checkVpnPermission();
        if (!hasPermission) {
          const granted = await permissionManager.requestVpnPermission();
          if (!granted) {
            throw new Error('VPN permission denied');
          }
        }
      }

      await mockVpnService.connect(selectedNode);
      setStatus('CONNECTED');
      // Auto run a quick ping test on connect (optional, but good UX)
      setSpeedStats(prev => ({ ...prev, latency: selectedNode.ping }));
    } catch (e) {
      console.error('Connection error:', e);
      setStatus('DISCONNECTED');
      throw e;
    }
  }, [selectedNode, isNativeApp]);

  const disconnect = useCallback(async () => {
    setStatus('DISCONNECTING');
    try {
      await mockVpnService.disconnect();
      setStatus('DISCONNECTED');
      setSpeedStats({ download: 0, upload: 0, latency: 0 });
    } catch (e) {
      console.error('Disconnection error:', e);
      setStatus('DISCONNECTED');
      throw e;
    }
  }, []);

  const selectNodeHandler = useCallback((node: VpnNode) => {
    if (status === 'CONNECTED' || status === 'CONNECTING') {
      // Prevent switching while connected for simplicity in this demo
      alert('Please disconnect before switching servers.');
      return;
    }
    setSelectedNode(node);
  }, [status]);

  const importSubscription = useCallback(async (url: string, forceRefresh = false) => {
    if (!url) return false;
    try {
      setIsUpdatingSubscriptions(true);
      const fetchedNodes = await mockVpnService.fetchSubscription(url, forceRefresh);
      
      // 刷新订阅列表和节点列表
      const updatedSubs = mockVpnService.getSubscriptions();
      setSubscriptions(updatedSubs);
      
      refreshNodeList();
      return true;
    } catch (e) {
      console.error('Failed to import subscription:', e);
      return false;
    } finally {
      setIsUpdatingSubscriptions(false);
    }
  }, [refreshNodeList]);

  useEffect(() => {
    if (autoImportTriedRef.current) return;
    const savedSubs = mockVpnService.getSubscriptions();
    if (savedSubs.length === 0 && DEFAULT_SUBSCRIPTION_URL) {
      autoImportTriedRef.current = true;
      importSubscription(DEFAULT_SUBSCRIPTION_URL).catch(() => {});
    }
  }, [importSubscription]);

  const removeSubscription = useCallback((url: string) => {
    mockVpnService.removeSubscription(url);
    const updatedSubs = mockVpnService.getSubscriptions();
    setSubscriptions(updatedSubs);
    
    // 刷新节点列表
    refreshNodeList();
  }, [refreshNodeList]);

  const updateAllSubscriptions = useCallback(async () => {
    if (isUpdatingSubscriptions) return;
    
    try {
      setIsUpdatingSubscriptions(true);
      await mockVpnService.updateAllSubscriptions();
      
      // 刷新订阅列表和节点列表
      const updatedSubs = mockVpnService.getSubscriptions();
      setSubscriptions(updatedSubs);
      
      refreshNodeList();
    } catch (e) {
      console.error('Failed to update subscriptions:', e);
    } finally {
      setIsUpdatingSubscriptions(false);
    }
  }, [isUpdatingSubscriptions, refreshNodeList]);

  const runSpeedTest = useCallback(async () => {
    if (status !== 'CONNECTED') return;
    
    setSpeedStats({ download: 0, upload: 0, latency: 0 });
    
    const results = await mockVpnService.performSpeedTest();
    setSpeedStats(results);
    if (selectedNode) {
      subscriptionService.updateNodePing(selectedNode.id, results.latency);
      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, ping: results.latency } : n));
    }
  }, [status, selectedNode]);

  const purchasePremium = useCallback(async (method: 'wechat' | 'alipay') => {
    // Simulate payment SDK delay
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            setIsPremium(true);
            resolve();
        }, 2000);
    });
  }, []);

  return {
    status,
    isConnected: status === 'CONNECTED',
    selectedNode,
    nodes,
    speedStats,
    isPremium,
    duration,
    subscriptions,
    trafficHistory,
    connect,
    disconnect,
    selectNode: selectNodeHandler,
    importSubscription,
    removeSubscription,
    updateAllSubscriptions,
    runSpeedTest,
    purchasePremium
  };
};
