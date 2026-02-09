import { useState, useEffect, useCallback, useRef } from 'react';
import { VpnViewModel, ConnectionStatus, VpnNode, SpeedStats } from '../types';
import { mockVpnService } from '../services/mockVpnService';
import { MOCK_NODES } from '../constants';

export const useVpnViewModel = (): VpnViewModel => {
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  // Initial sort as per requirement
  const [nodes, setNodes] = useState<VpnNode[]>(MOCK_NODES.sort((a, b) => a.name.localeCompare(b.name)));
  const [selectedNode, setSelectedNode] = useState<VpnNode | null>(MOCK_NODES[0] || null);
  const [speedStats, setSpeedStats] = useState<SpeedStats>({ download: 0, upload: 0, latency: 0 });
  const [isPremium, setIsPremium] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const timerRef = useRef<number | null>(null);

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
      await mockVpnService.connect(selectedNode);
      setStatus('CONNECTED');
      // Auto run a quick ping test on connect (optional, but good UX)
      setSpeedStats(prev => ({ ...prev, latency: selectedNode.ping }));
    } catch (e) {
      setStatus('DISCONNECTED');
    }
  }, [selectedNode]);

  const disconnect = useCallback(async () => {
    setStatus('DISCONNECTING');
    await mockVpnService.disconnect();
    setStatus('DISCONNECTED');
    setSpeedStats({ download: 0, upload: 0, latency: 0 });
  }, []);

  const selectNode = useCallback((node: VpnNode) => {
    if (status === 'CONNECTED' || status === 'CONNECTING') {
      // Prevent switching while connected for simplicity in this demo
      alert('Please disconnect before switching servers.');
      return;
    }
    setSelectedNode(node);
  }, [status]);

  const importSubscription = useCallback(async (url: string) => {
    if (!url) return false;
    try {
      const fetchedNodes = await mockVpnService.fetchSubscription(url);
      setNodes(fetchedNodes);
      if (fetchedNodes.length > 0 && !selectedNode) {
        setSelectedNode(fetchedNodes[0]);
      }
      return true;
    } catch (e) {
      return false;
    }
  }, [selectedNode]);

  const runSpeedTest = useCallback(async () => {
    if (status !== 'CONNECTED') return;
    
    // Reset stats visually for test start
    setSpeedStats({ download: 0, upload: 0, latency: 0 });
    
    const results = await mockVpnService.performSpeedTest();
    setSpeedStats(results);
  }, [status]);

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
    connect,
    disconnect,
    selectNode,
    importSubscription,
    runSpeedTest,
    purchasePremium
  };
};