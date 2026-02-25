/**
 * VPN 订阅系统的使用示例
 * 展示如何在实际应用中集成订阅功能
 */

// ============ 示例 1: 在组件中集成订阅管理 ============

import { useVpnViewModel } from '../hooks/useVpnViewModel';
import { useState } from 'react';

// 返回的 vm 现在包含：
// vm.subscriptions          - 当前订阅列表 (Subscription[])
// vm.importSubscription()   - 添加新订阅
// vm.removeSubscription()   - 删除订阅
// vm.updateAllSubscriptions() - 手动更新所有订阅

const exampleUsageComponent = () => {
  const vm = useVpnViewModel();
  const [subscriptionUrl, setSubscriptionUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 处理添加订阅
  const handleAddSubscription = async () => {
    if (!subscriptionUrl.trim()) return;
    
    setIsLoading(true);
    try {
      const success = await vm.importSubscription(subscriptionUrl);
      
      if (success) {
        console.log(`✅ 订阅添加成功！获取到 ${vm.nodes.length} 个节点`);
        setSubscriptionUrl('');
      } else {
        console.log('❌ 添加订阅失败，请检查链接是否正确');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 处理更新所有订阅
  const handleUpdateAllSubscriptions = async () => {
    setIsLoading(true);
    try {
      await vm.updateAllSubscriptions();
      console.log('✅ 所有订阅已更新');
    } catch (error) {
      console.log(`❌ 更新失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理删除订阅
  const handleRemoveSubscription = (url: string) => {
    if (confirm('确定要删除此订阅吗？')) {
      vm.removeSubscription(url);
      console.log('✅ 订阅已删除');
    }
  };

  return {
    handleAddSubscription,
    handleUpdateAllSubscriptions,
    handleRemoveSubscription,
    subscriptionUrl,
    setSubscriptionUrl,
    isLoading,
  };
};


// ============ 示例 2: 订阅链接格式 ============

/**
 * v2rayn 格式的订阅链接示例
 * 
 * 单个 vless 链接:
 * vless://d41d8cd98f00b204e9800998ecf8427e@example.com:443?encryption=none&security=tls&alpn=h2,http/1.1&sni=example.com#My Node
 * 
 * 订阅链接（返回多行节点）:
 * https://example.com/subscribe?token=abc123
 * 
 * 返回内容 (base64 编码):
 * dless://uuid1@server1.com:443?...#节点1
 * vless://uuid2@server2.com:443?...#节点2
 * vmess://base64(...#节点3
 * trojan://pwd@server3.com:443#节点4
 */


// ============ 示例 3: 手动测试订阅服务 ============

import { subscriptionService } from '../services/subscriptionService';
import { parseSubscriptionLink } from '../services/protocolParser';

const testSubscriptionService = async () => {
  // 测试 1: 解析单个节点
  const singleNode = parseSubscriptionLink(
    'vless://d41d8cd98f00b204e9800998ecf8427e@example.com:443?encryption=none&security=tls&sni=example.com#Japan-Tokyo'
  );
  console.log('解析的节点:', singleNode);

  // 测试 2: 获取并缓存订阅
  try {
    const nodes = await subscriptionService.fetchAndParseSubscription(
      'https://example.com/subscribe?token=abc123'
    );
    console.log('获取到的节点:', nodes);
    
    // 测试 3: 获取已保存的订阅
    const savedSubs = subscriptionService.getSubscriptions();
    console.log('已保存的订阅:', savedSubs);
    
    // 测试 4: 检查是否需要更新
    const needsUpdate = subscriptionService.needsUpdate('https://example.com/subscribe?token=abc123');
    console.log('是否需要更新:', needsUpdate);
    
  } catch (error) {
    console.error('订阅服务错误:', error);
  }
};


// ============ 示例 4: 自动更新配置 ============

/**
 * 自动更新机制说明:
 * 
 * 1. App 启动时自动检查是否需要更新（间隔24小时）
 * 2. 如果距离上次更新超过24小时，自动在后台更新
 * 3. 更新完成后自动刷新节点列表
 * 4. 用户也可以手动触发更新
 * 
 * 配置:
 * - 缓存时间: 24小时 (AUTO_UPDATE_INTERVAL)
 * - 更新记录存储: LocalStorage (STORAGE_KEY_LAST_UPDATE)
 * - 订阅数据存储: LocalStorage (vpn_subscriptions)
 */

import { useAutoUpdateSubscriptions, getTimeUntilNextUpdate, formatTimeUntilUpdate } from '../hooks/useAutoUpdateSubscriptions';

const autoUpdateExample = () => {
  // 在组件中使用
  const { updateAllSubscriptions, checkAndAutoUpdate } = useAutoUpdateSubscriptions(
    () => console.log('订阅已更新！')
  );

  // 获取更新信息
  const msUntilUpdate = getTimeUntilNextUpdate();
  const timeString = formatTimeUntilUpdate();
  
  return {
    updateAllSubscriptions,
    checkAndAutoUpdate,
    nextUpdateTime: timeString,
  };
};


// ============ 示例 5: 完整的订阅流程 ============

/**
 * 典型使用流程:
 * 
 * 1. 用户添加订阅链接
 *    vm.importSubscription('https://example.com/subscribe?token=...')
 * 
 * 2. 系统自动处理:
 *    - 获取订阅内容 (HTTP GET)
 *    - Base64 解码 (如果编码了)
 *    - 按行分割
 *    - 解析每一行为 VpnNode
 *    - 本地缓存到 LocalStorage
 * 
 * 3. 用户选择节点并连接
 *    vm.selectNode(node)
 *    vm.connect()
 * 
 * 4. 每天自动更新
 *    - App 启动时检查
 *    - 如果距离上次更新 >= 24小时，自动更新
 *    - 无需用户操作
 * 
 * 5. 用户可手动更新
 *    vm.updateAllSubscriptions()
 */

// ============ 示例 6: JSBridge 集成 ============

import { vpnBridgeService } from '../services/vpnBridgeService';
import { useVpnBridge } from '../hooks/useVpnBridge';
import { mockVpnService } from '../services/mockVpnService';

const jsbridgeExample = () => {
  // 检查是否在 App 中运行
  const isNativeApp = vpnBridgeService.isReady();
  const platform = vpnBridgeService.getPlatform();
  
  console.log(`Running on platform: ${platform}`);
  console.log(`Is native app: ${isNativeApp}`);

  // 使用 Bridge Hook
  const {
    connect,
    disconnect,
    testLatency,
    runSpeedTest,
    checkPermission,
    requestPermission,
  } = useVpnBridge();

  // 这些方法会自动：
  // - 如果在 App 中 → 调用真实原生功能
  // - 如果在浏览器中 → 使用 Mock 数据

  return {
    connect,
    disconnect,
    testLatency,
    runSpeedTest,
    checkPermission,
    requestPermission,
  };
};

// ============ 示例 7: VPN 操作 ============

const vpnOperationExample = async () => {
  const mockService = mockVpnService;

  // 1. 获取所有节点
  const allNodes = mockService.getAllSubscriptionNodes();
  console.log(`Available nodes: ${allNodes.length}`);

  // 2. 连接到节点
  try {
    const node = allNodes[0];
    await mockService.connect(node);
    console.log('Connected to:', node.name);
  } catch (error) {
    console.error('Connection failed:', error);
  }

  // 3. 测试延迟
  const latencies = await mockService.testMultipleLatencies(allNodes);
  console.log('Latencies:', latencies);

  // 4. 运行速度测试
  const speedResult = await mockService.performSpeedTest();
  console.log('Speed test result:', speedResult);

  // 5. 获取 VPN 状态
  const status = await mockService.getVpnStatus();
  console.log('VPN status:', status);

  // 6. 断开连接
  await mockService.disconnect();
  console.log('Disconnected');
};

export {};

