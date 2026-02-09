import { useState, useEffect, useCallback, useRef } from 'react';
import { mockVpnService } from '../services/mockVpnService';

export const useVpnViewModel = () => {
  const [status, setStatus] = useState('DISCONNECTED');
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [speedStats, setSpeedStats] = useState({ download: 0, upload: 0, latency: 0 });
  const [isPremium, setIsPremium] = useState(false);
  const [duration, setDuration] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const initialNodes = await mockVpnService.fetchSubscription('mock://default');
      initialNodes.sort((a, b) => a.name.localeCompare(b.name));
      setNodes(initialNodes);
      setSelectedNode(initialNodes[0] || null);
    })();
  }, []);

  useEffect(() => {
    if (status === 'CONNECTED') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
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
      setSpeedStats((prev) => ({ ...prev, latency: selectedNode.ping }));
    } catch {
      setStatus('DISCONNECTED');
    }
  }, [selectedNode]);

  const disconnect = useCallback(async () => {
    setStatus('DISCONNECTING');
    await mockVpnService.disconnect();
    setStatus('DISCONNECTED');
    setSpeedStats({ download: 0, upload: 0, latency: 0 });
  }, []);

  const selectNode = useCallback(
    (node) => {
      if (status === 'CONNECTED' || status === 'CONNECTING') return;
      setSelectedNode(node);
    },
    [status]
  );

  const importSubscription = useCallback(async (url) => {
    if (!url) return false;
    try {
      const fetchedNodes = await mockVpnService.fetchSubscription(url);
      setNodes(fetchedNodes);
      if (fetchedNodes.length > 0 && !selectedNode) {
        setSelectedNode(fetchedNodes[0]);
      }
      return true;
    } catch {
      return false;
    }
  }, [selectedNode]);

  const runSpeedTest = useCallback(async () => {
    if (status !== 'CONNECTED') return;
    setSpeedStats({ download: 0, upload: 0, latency: 0 });
    const results = await mockVpnService.performSpeedTest();
    setSpeedStats(results);
  }, [status]);

  const purchasePremium = useCallback(async (method) => {
    return new Promise((resolve) => {
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
    purchasePremium,
  };
};
