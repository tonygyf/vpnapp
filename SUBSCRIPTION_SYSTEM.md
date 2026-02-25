# VPN 订阅系统架构文档

## 概述

已为 VPN 应用搭建完整的真实订阅链接管理系统，支持 v2rayn 格式的订阅链接解析和自动更新。

---

## 🏗️ 架构组件

### 1. **协议解析服务** (`services/protocolParser.ts`)
- ✅ 支持协议：**vless**（主要）、vmess、trojan、shadowsocks
- ✅ 自动识别链接协议类型
- ✅ 提取节点信息（地址、端口、SNI、加密方式等）
- ✅ 自动区域检测和国旗获取

**使用示例：**
```typescript
import { parseSubscriptionLink } from './services/protocolParser';

const node = parseSubscriptionLink('vless://user-id@example.com:443?encryption=none&security=tls#My Node');
```

### 2. **订阅管理服务** (`services/subscriptionService.ts`)
- ✅ LocalStorage 本地持久化存储
- ✅ base64 编码/解码支持
- ✅ 24小时缓存机制
- ✅ 多订阅合并和去重
- ✅ 订阅增删改查操作

**主要方法：**
```typescript
subscriptionService.fetchAndParseSubscription(url, forceRefresh?)  // 获取并解析订阅
subscriptionService.getSubscriptions()                              // 获取所有订阅
subscriptionService.removeSubscription(url)                         // 删除订阅
subscriptionService.mergeSubscriptions(urls)                        // 合并多个订阅
```

### 3. **自动更新 Hook** (`hooks/useAutoUpdateSubscriptions.ts`)
- ✅ 每天自动更新一次
- ✅ app 启动时检查更新
- ✅ 手动更新触发
- ✅ 更新时间追踪

**使用示例：**
```typescript
const { updateAllSubscriptions, checkAndAutoUpdate } = useAutoUpdateSubscriptions(
  () => console.log('更新完成')
);
```

### 4. **VPN 视图模型** (`hooks/useVpnViewModel.ts`)
**新增方法：**
```typescript
vm.importSubscription(url, forceRefresh?)     // 导入订阅链接
vm.removeSubscription(url)                     // 删除订阅
vm.updateAllSubscriptions()                    // 手动更新所有订阅
vm.subscriptions                               // 订阅列表状态
```

### 5. **VPN 服务** (`services/mockVpnService.ts`)
**新增方法：**
```typescript
mockVpnService.getAllSubscriptionNodes()      // 获取所有订阅节点
mockVpnService.getSubscriptions()              // 获取订阅列表
mockVpnService.removeSubscription(url)         // 删除订阅
mockVpnService.updateAllSubscriptions()        // 更新所有订阅
```

---

## 📊 数据存储结构

### 订阅信息 (`Subscription`)
```typescript
interface Subscription {
  url: string;                // 订阅链接
  name?: string;              // 订阅名称（自动提取）
  lastUpdate: number;         // 上次更新时间戳
  nodes: VpnNode[];          // 节点列表
}
```

### VPN 节点 (`VpnNode`)
```typescript
interface VpnNode {
  id: string;                 // 唯一标识
  name: string;               // 节点名称
  protocol: 'vmess' | 'vless' | 'trojan';
  region: string;             // 地区
  flag: string;               // 国旗 emoji
  ping: number;               // 延迟（ms）
  isPremium: boolean;
  _raw?: any;                 // 原始协议配置（保留用于实际连接）
}
```

---

## 🎯 使用流程

### 添加订阅
```typescript
const vm = useVpnViewModel();

// 用户输入订阅链接
const subscriptionUrl = 'https://example.com/subscribe?token=abc123';

// 导入订阅
const success = await vm.importSubscription(subscriptionUrl);

if (success) {
  console.log('订阅添加成功！');
  console.log('获取到节点数：', vm.nodes.length);
  console.log('已保存订阅：', vm.subscriptions);
}
```

### 自动更新
```typescript
// 每天自动检查更新（app 启动时）
const { updateAllSubscriptions } = useAutoUpdateSubscriptions();

// 手动更新
await vm.updateAllSubscriptions();
```

### 删除订阅
```typescript
vm.removeSubscription('https://example.com/subscribe?token=abc123');
```

---

## 🔄 数据流

```
用户输入订阅URL
    ↓
importSubscription()
    ↓
subscriptionService.fetchAndParseSubscription()
    ↓
fetch url → base64 decode → 按行分割
    ↓
protocolParser 解析每一行
    ↓
生成 VpnNode[] → LocalStorage 缓存
    ↓
刷新 UI 节点列表
```

---

## 📋 支持的订阅链接格式

### VLESS 格式（主要）
```
vless://user-id@example.com:443?encryption=none&security=tls&sni=example.com#节点名称
```

### VMESS 格式
```
vmess://base64({"v":"2","ps":"节点名","add":"example.com","port":443,"id":"user-id"...})
```

### Trojan 格式
```
trojan://password@example.com:443?sni=example.com#节点名称
```

### Shadowsocks 格式
```
ss://base64(method:password)@example.com:8388#节点名称
```

---

## ⚙️ 缓存和更新策略

### 缓存机制
- **缓存时间**：24小时
- **存储位置**：LocalStorage (`vpn_subscriptions`)
- **更新检查**：App 启动时自动检查

### 手动强制更新
```typescript
await vm.importSubscription(url, true);  // 强制刷新
await vm.updateAllSubscriptions();        // 手动更新所有
```

---

## 🚀 下一步集成步骤

当你提供真实订阅链接时，系统将：

1. ✅ **自动识别**协议类型（vless/vmess/trojan/ss）
2. ✅ **解析**所有节点信息（地址、端口、加密等）
3. ✅ **本地缓存**以减少网络请求
4. ✅ **每天自动**更新节点列表
5. ✅ **支持**多个订阅同时管理

---

## 📝 示例 UI 集成（待实现）

建议在以下位置添加订阅管理 UI：

1. **HomeView** - 显示当前订阅状态和更新按钮
2. **ServersView** - 显示订阅列表，支持添加/删除/更新单个订阅
3. **设置/Profile** - 高级订阅管理选项

---

## ✨ 特点总结

- 🔐 支持所有主流 v2ray 协议
- 📦 完整的 base64 解码支持
- 💾 智能本地缓存（减少 API 调用）
- ⏰ 每天自动更新（后台无感）
- 🔄 支持多订阅合并
- 🌐 自动区域和国旗识别
- 📊 完整的类型系统（TypeScript）

---

**现在已准备就绪，等待你提供真实的订阅链接！** 🎉
