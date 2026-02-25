# JSBridge 集成指南

## 概述

这个文档说明如何通过 JSBridge 将前端 React 应用与原生 VPN 应用壳子集成，实现真实的 VPN 连接和系统设置修改功能。

---

## 📦 核心架构

### 三层架构

```
┌─────────────────────────────────────┐
│   前端 React 应用                    │
│   (hooks & components)              │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   JSBridge / VPN Bridge 层          │
│   (services & hooks)                │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   原生 App 壳子                      │
│   (Android/iOS VPN 实现)            │
└─────────────────────────────────────┘
```

### 文件结构

```
services/
├── jsbridge.ts               ← JSBridge 通信层（消息收发）
├── vpnBridgeService.ts      ← VPN 操作接口（调用原生 VPN）
├── permissionManager.ts     ← 权限管理
└── mockVpnService.ts        ← VPN 服务（Bridge + Mock 双模式）

hooks/
├── useVpnBridge.ts          ← VPN Bridge React Hook
├── useVpnViewModel.ts       ← 主 ViewModel（已集成 Bridge）
└── useAutoUpdateSubscriptions.ts
```

---

## 🔌 JSBridge 工作原理

### Android 集成

原生代码（Android）需要注入 JavaScript 接口：

```java
// Android WebViewClient.java
WebView webView = findViewById(R.id.webview);
JSBridgeInterface jsbridge = new JSBridgeInterface();
webView.addJavascriptInterface(jsbridge, "VpnJSBridge");

// 前端通过 window.VpnJSBridge 调用原生方法
```

### iOS 集成

原生代码（iOS）需要设置 WKWebView 消息处理：

```swift
// iOS WKWebViewConfiguration
let userContentController = WKUserContentController()
userContentController.add(self, name: "vpnBridge")
let config = WKWebViewConfiguration()
config.userContentController = userContentController
webView = WKWebView(frame: .zero, configuration: config)

// 前端通过 webkit.messageHandlers.vpnBridge 调用原生方法
```

---

## 📤 消息格式

### 前端 → 原生（请求）

```typescript
// JavaScript 侧
jsbridge.call('native.vpn.connect', {
  id: 'node_id',
  name: 'Node Name',
  protocol: 'vless',
  config: { /* 协议配置 */ }
})

// 发送的 JSON
{
  id: 1,
  method: 'native.vpn.connect',
  params: {
    id: 'node_id',
    name: 'Node Name',
    protocol: 'vless',
    config: { /* 协议配置 */ }
  }
}
```

### 原生 → 前端（响应）

```json
{
  "type": "callback",
  "id": 1,
  "data": {
    "success": true
  }
}
```

### 原生 → 前端（事件）

```json
{
  "type": "event",
  "name": "vpn-status-changed",
  "data": {
    "connected": true,
    "duration": 3600
  }
}
```

---

## 🎯 VPN 操作接口

### 1. 连接 VPN

```typescript
// 前端使用
const vm = useVpnViewModel();
await vm.connect();

// 或使用 Hook
const { connect } = useVpnBridge();
await connect(node);

// 原生接收：
// 方法：native.vpn.connect
// 参数：{ id, name, protocol, config }
// 返回：{ success: boolean, error?: string }
```

### 2. 断开连接

```typescript
await vm.disconnect();

// 原生接收：
// 方法：native.vpn.disconnect
// 返回：{ success: boolean }
```

### 3. 获取状态

```typescript
const status = await vpnBridgeService.getVpnStatus();
// { connected: boolean, currentNode?: VpnNode, duration: number }

// 原生接收：
// 方法：native.vpn.getStatus
// 返回：{ connected, duration, bytesTransferred }
```

### 4. 测试延迟

```typescript
const latency = await vpnBridgeService.testLatency(node);
// 返回：毫秒数

// 原生接收：
// 方法：native.vpn.testLatency
// 参数：{ id, config }
// 返回：{ success, latency }
```

### 5. 速度测试

```typescript
const result = await vpnBridgeService.runSpeedTest();
// { download, upload, latency }

// 原生接收：
// 方法：native.vpn.speedTest
// 返回：{ success, download, upload, latency }
```

### 6. 权限检查

```typescript
const result = await vpnBridgeService.checkPermissions();
// { granted: boolean, reason?: string }

// 原生接收：
// 方法：native.checkVpnPermissions
// 返回：{ granted: boolean }
```

---

## 📡 事件系统

### 原生发送的事件

#### 1. VPN 连接状态变化

```typescript
// 原生发送
{
  type: 'event',
  name: 'vpn-status-changed',
  data: {
    connected: boolean,
    currentNode?: VpnNode,
    duration: number
  }
}

// 前端监听
vpnBridgeService.onVpnStatusChanged((status) => {
  console.log('VPN connected:', status.connected);
  console.log('Duration:', status.duration);
});
```

#### 2. VPN 错误

```typescript
{
  type: 'event',
  name: 'vpn-error',
  data: {
    code: 'ERROR_CODE',
    message: 'Error message'
  }
}

// 前端监听
vpnBridgeService.onVpnError((error) => {
  console.error('VPN error:', error.message);
});
```

#### 3. 连接时长更新

```typescript
{
  type: 'event',
  name: 'vpn-duration-update',
  data: 3600 // 秒数
}

// 前端监听
vpnBridgeService.onDurationUpdate((duration) => {
  console.log('Connected for:', duration, 'seconds');
});
```

#### 4. 流量统计更新

```typescript
{
  type: 'event',
  name: 'vpn-traffic-update',
  data: {
    upload: 1024000,    // 字节
    download: 5120000
  }
}

// 前端监听
vpnBridgeService.onTrafficUpdate((traffic) => {
  console.log('Upload:', traffic.upload, 'Download:', traffic.download);
});
```

---

## 🔐 权限管理

### Android 权限

原生代码需要申请：
- `android.permission.BIND_VPN_SERVICE` - VPN 权限
- `android.permission.INTERNET` - 网络连接
- `android.permission.ACCESS_NETWORK_STATE` - 网络状态

### iOS 权限

原生代码需要支持：
- Network Extension 框架
- Personal VPN 权限

### 前端权限检查

```typescript
import { permissionManager } from 'services/permissionManager';

// 检查权限
const granted = await permissionManager.checkVpnPermission();

// 请求权限
const result = await permissionManager.requestVpnPermission();

// 获取所有权限状态
const allPermissions = await permissionManager.getAllPermissions();
```

---

## 🏗️ 原生代码实现指南

### Android 实现示例

```java
public class JSBridgeInterface {
    private VpnManager vpnManager;
    
    @JavascriptInterface
    public void postMessage(String jsonMessage) {
        JSONObject msg = new JSONObject(jsonMessage);
        String method = msg.getString("method");
        JSONObject params = msg.getJSONObject("params");
        
        switch(method) {
            case "native.vpn.connect":
                handleVpnConnect(msg.getInt("id"), params);
                break;
            case "native.vpn.disconnect":
                handleVpnDisconnect(msg.getInt("id"));
                break;
            // ... 其他方法
        }
    }
    
    private void handleVpnConnect(int messageId, JSONObject params) {
        try {
            VpnConfig config = parseVpnConfig(params);
            vpnManager.connect(config, success -> {
                sendCallback(messageId, success);
            });
        } catch (Exception e) {
            sendError(messageId, e.getMessage());
        }
    }
    
    private void sendCallback(int messageId, boolean success) {
        String callback = String.format(
            "window.handleWebMessage({type:'callback',id:%d,data:{success:%b}})",
            messageId, success
        );
        webView.evaluateJavascript(callback, null);
    }
    
    private void sendEvent(String eventName, Object data) {
        String event = String.format(
            "window.handleNativeMessage({type:'event',name:'%s',data:%s})",
            eventName, gson.toJson(data)
        );
        webView.evaluateJavascript(event, null);
    }
}
```

### iOS 实现示例

```swift
import WebKit

class JSBridgeHandler: NSObject, WKScriptMessageHandler {
    var vpnManager: VpnManager
    var webView: WKWebView
    
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any] else { return }
        
        let method = body["method"] as? String ?? ""
        let messageId = body["id"] as? Int ?? 0
        let params = body["params"] as? [String: Any] ?? [:]
        
        switch method {
        case "native.vpn.connect":
            handleVpnConnect(messageId: messageId, params: params)
        case "native.vpn.disconnect":
            handleVpnDisconnect(messageId: messageId)
        default:
            break
        }
    }
    
    private func handleVpnConnect(messageId: Int, params: [String: Any]) {
        DispatchQueue.main.async {
            self.vpnManager.connect(config: params) { success, error in
                self.sendCallback(messageId: messageId, success: success, error: error)
            }
        }
    }
    
    private func sendCallback(messageId: Int, success: Bool, error: String? = nil) {
        let response: [String: Any] = [
            "type": "callback",
            "id": messageId,
            "data": ["success": success, "error": error as Any]
        ]
        
        let json = try! JSONSerialization.data(withJSONObject: response)
        let jsonString = String(data: json, encoding: .utf8) ?? ""
        
        let script = "window.handleNativeMessage(\(jsonString))"
        webView.evaluateJavaScript(script)
    }
    
    func sendEvent(_ eventName: String, data: [String: Any]) {
        let event: [String: Any] = [
            "type": "event",
            "name": eventName,
            "data": data
        ]
        
        let json = try! JSONSerialization.data(withJSONObject: event)
        let jsonString = String(data: json, encoding: .utf8) ?? ""
        
        let script = "window.handleNativeMessage(\(jsonString))"
        webView.evaluateJavaScript(script)
    }
}
```

---

## 🧪 测试模式

应用自动支持两种模式：

### 1. App 模式（原生 VPN）
- 检测到 JSBridge 可用
- 所有操作调用真实原生功能
- 实际修改系统 VPN 设置

### 2. 浏览器模式（Mock）
- 在浏览器中打开应用
- 模拟所有操作（延迟、随机数据）
- 用于开发和测试 UI

---

## 🚀 部署流程

### 1. 前端打包

```bash
npm run build
```

生成的 `dist` 文件夹放入原生 App 的 WebView 资源目录。

### 2. 原生集成

- 创建 WebView 容器
- 注入 JSBridge 接口（见上文 Android/iOS 示例）
- 实现各个原生方法（connect、disconnect 等）

### 3. 测试

- 浏览器测试：Mock 模式测试 UI
- App 测试：真实 VPN 功能测试

---

## 📋 方法调用超时

所有 JSBridge 调用都有 30 秒超时限制：

```typescript
// 超时将抛出错误
try {
  await jsbridge.call('native.vpn.connect', config);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Operation timed out after 30 seconds');
  }
}
```

---

## 🔍 调试

### 前端调试

```typescript
// 启用日志
jsbridge.call('native.vpn.connect', config)
  .then(result => console.log('Result:', result))
  .catch(error => console.error('Error:', error));

// 监听所有事件
jsbridge.on('*', (data) => console.log('Event:', data));
```

### 原生调试

在原生代码中添加日志记录所有 JSBridge 调用和回调：

```java
// Android
Log.d("JSBridge", "Received: " + jsonMessage);
Log.d("JSBridge", "Sending callback: " + callback);

// iOS
print("JSBridge received: \(body)")
```

---

## 🎉 完成！

现在你的应用已经准备好与原生 VPN 壳子集成。所有必要的 JSBridge 层都已实现，只需要在原生代码中实现对应的方法即可。
