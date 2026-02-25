# JSBridge 集成指南 (2026年2月25日更新)

## 概述

完整的 JSBridge 实现，将前端 React 应用与原生 VPN 应用壳子集成。通过消息队列机制实现双向通信，支持 Android 和 iOS 平台。

---

## 📦 核心架构

### 三层架构

```
┌─────────────────────────────────────┐
│   前端 React 应用                    │
│   定义方法调用和事件监听            │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   JSBridge 通信层                   │
│   - jsbridge.ts (单例)              │
│   - 消息队列、超时、回调管理        │
│   - Android & iOS 双协议支持        │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   VPN Bridge 服务层                 │
│   - vpnBridgeService.ts             │
│   - 权限管理、事件监听              │
│   - 状态管理                        │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   原生 App 壳子                      │
│   Android/iOS WebView + VPN 实现    │
└─────────────────────────────────────┘
```

### 文件结构

```
services/
├── jsbridge.ts               ← ⭐ JSBridge 核心（消息队列、超时、回调）
├── vpnBridgeService.ts      ← VPN 操作接口（高级 API）
├── permissionManager.ts     ← 权限管理
├── protocolParser.ts        ← 协议解析
├── subscriptionService.ts   ← 订阅管理
└── mockVpnService.ts        ← VPN 服务汇总（Bridge + Mock 双模式）

hooks/
├── useVpnBridge.ts          ← VPN Bridge React Hook
├── useVpnViewModel.ts       ← 主 ViewModel（已集成 Bridge）
└── useAutoUpdateSubscriptions.ts
```

## 🔌 JSBridge 工作原理

### 核心机制

#### 1. 初始化阶段

```typescript
// jsbridge.ts 中的初始化逻辑
1. 页面加载时自动检测平台
2. Android: 等待 window.VpnJSBridge 注入
3. iOS: 等待 webkit.messageHandlers.vpnBridge 就绪
4. 发送 bridge-ready 事件
```

#### 2. 消息发送流程

```
┌─────────────────────────────────┐
│ 前端调用: jsbridge.call('native.vpn.connect', params)
└────────────┬────────────────────┘
             │
             ▼
      ┌──────────────────────────┐
      │ 生成消息ID（++messageId）│
      │ 记录待回复消息到队列     │
      └────────┬─────────────────┘
               │
               ▼
      ┌────────────────────────────┐
      │ 选择平台发送               │
      │ Android: VpnJSBridge.post  │
      │ iOS: webkit.messageHandlers│
      └────────┬───────────────────┘
               │
               ▼
         ┌─────────────┐
         │ 原生代码接收│
         └────────┬────┘
                  │
                  ▼
         ┌───────────────────┐
         │ 执行对应的方法    │
         │ 获取结果          │
         └────────┬──────────┘
                  │
                  ▼
         ┌──────────────────────────────┐
         │ 回调: handleNativeMessage()   │
         │ 发送回复消息（含 messageId）  │
         └────────┬─────────────────────┘
                  │
                  ▼
         ┌─────────────────────┐
         │ 前端匹配 messageId  │
         │ 找到对应的 Promise  │
         │ resolve() 返回结果  │
         └─────────────────────┘
```

#### 3. 超时管理

```typescript
// 所有调用都有 30 秒超时（可配置）
const pendingMsg: PendingMessage = {
  callback: (response) => { /* ... */ },
  timeout: window.setTimeout(() => {
    this.pendingMessages.delete(messageId);
    reject(new Error(`JSBridge timeout: ${method}`));
  }, 30000), // ← 30秒超时
};
```

### Android 实现流程

```java
// 1. WebView 中注册 JSBridge
webView.addJavascriptInterface(new JSBridgeInterface(this), "VpnJSBridge");

// 2. 前端发送消息
window.VpnJSBridge.postMessage(JSON.stringify({
  id: 1,
  method: 'native.vpn.connect',
  params: { /* 配置 */ }
}));

// 3. 原生代码处理
public void postMessage(String jsonMessage) {
  JSONObject msg = new JSONObject(jsonMessage);
  int messageId = msg.getInt("id");
  String method = msg.getString("method");
  
  // 执行相应的业务逻辑
  // ...
  
  // 4. 返回结果
  webView.evaluateJavascript(
    "window.handleWebMessage({" +
      "type:'callback'," +
      "id:" + messageId + "," +
      "data:{success:true}" +
    "})",
    null
  );
}
```

### iOS 实现流程

```swift
// 1. 设置 WKWebView 消息处理
let config = WKWebViewConfiguration()
config.userContentController.add(self, name: "vpnBridge")

// 2. 前端发送消息
webkit.messageHandlers.vpnBridge.postMessage({
  id: 1,
  method: 'native.vpn.connect',
  params: { /* 配置 */ }
})

// 3. 原生代码处理
func userContentController(_ userContentController: WKUserContentController,
                          didReceive message: WKScriptMessage) {
  let body = message.body as? [String: Any]
  let messageId = body["id"] as? Int
  let method = body["method"] as? String
  
  // 执行业务逻辑
  // ...
  
  // 4. 返回结果
  let response = [
    "type": "callback",
    "id": messageId,
    "data": ["success": true]
  ]
  webView.evaluateJavaScript("window.handleNativeMessage(\(response))")
}

## 🎯 前端 API 使用

### 1. JSBridge 核心 API

```typescript
import { jsbridge } from 'services/jsbridge';

// 检查 JSBridge 是否就绪
if (jsbridge.isReady()) {
  console.log('在 App 中运行');
} else {
  console.log('在浏览器中运行');
}

// 调用原生方法
await jsbridge.call('native.vpn.connect', {
  id: 'node_id',
  name: 'Node Name',
  protocol: 'vless',
  config: { /* 配置对象 */ }
});

// 监听原生事件
jsbridge.on('vpn-status-changed', (status) => {
  console.log('VPN 状态改变:', status);
});

// 监听一次事件
jsbridge.once('vpn-connected', () => {
  console.log('已连接');
});

// 获取平台
const platform = jsbridge.getPlatform(); // 'android' | 'ios' | 'web'
```

### 2. VPN Bridge 服务

```typescript
import { vpnBridgeService } from 'services/vpnBridgeService';

// 连接到 VPN 节点
try {
  const success = await vpnBridgeService.connect(node);
  console.log('已连接:', node.name);
} catch (error) {
  console.error('连接失败:', error);
}

// 断开连接
await vpnBridgeService.disconnect();

// 获取 VPN 状态
const status = await vpnBridgeService.getVpnStatus();
console.log('连接持续时间（秒）:', status.duration);

// 测试单个节点延迟
const latency = await vpnBridgeService.testLatency(node);
console.log('延迟:', latency, 'ms');

// 批量测试延迟
const results = await vpnBridgeService.testMultipleLatencies(nodes);
for (const [nodeId, latency] of results) {
  console.log(`${nodeId}: ${latency}ms`);
}

// 运行速度测试
const speedResult = await vpnBridgeService.runSpeedTest();
console.log(`下载: ${speedResult.download} Mbps`);
console.log(`上传: ${speedResult.upload} Mbps`);

// 监听事件
vpnBridgeService.onVpnStatusChanged((status) => {
  console.log('状态:', status.connected);
});

vpnBridgeService.onVpnError((error) => {
  console.error('VPN 错误:', error.message);
});

vpnBridgeService.onDurationUpdate((duration) => {
  console.log('连接时长:', duration, '秒');
});

vpnBridgeService.onTrafficUpdate((traffic) => {
  console.log('上传:', traffic.upload, '字节');
  console.log('下载:', traffic.download, '字节');
});

// 检查权限
const permission = await vpnBridgeService.checkPermissions();
if (!permission.granted) {
  const result = await vpnBridgeService.requestPermissions();
}
```

### 3. React Hook 使用

```typescript
import { useVpnBridge } from 'hooks/useVpnBridge';

function MyComponent() {
  const {
    connect,
    disconnect,
    getStatus,
    testLatency,
    testMultipleLatencies,
    runSpeedTest,
    checkPermission,
    requestPermission,
    onStatusChanged,
    onError,
    onDurationUpdate,
    onTrafficUpdate,
  } = useVpnBridge();

  // 使用 Hook
  const handleConnect = async () => {
    try {
      await connect(selectedNode);
    } catch (error) {
      console.error('连接失败:', error);
    }
  };

  // 监听事件
  useEffect(() => {
    const unsubscribe = onStatusChanged((status) => {
      console.log('VPN 状态:', status.connected);
    });
    return unsubscribe;
  }, []);
}
```

### 4. ViewModel 集成

```typescript
// useVpnViewModel.ts 已集成 JSBridge
const vm = useVpnViewModel();

// 直接使用
await vm.connect();
await vm.disconnect();
await vm.importSubscription(url);
await vm.updateAllSubscriptions();

// 状态
console.log('连接状态:', vm.status);
console.log('已连接节点:', vm.selectedNode);
console.log('订阅列表:', vm.subscriptions);
```

## 📡 原生方法清单

所有原生方法的完整列表和参数说明：

### VPN 连接相关

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `native.vpn.connect` | `{id, name, protocol, config}` | `{success, error?}` | 连接到 VPN 节点 |
| `native.vpn.disconnect` | `{}` | `{success}` | 断开 VPN 连接 |
| `native.vpn.getStatus` | `{}` | `{connected, duration, bytesTransferred?}` | 获取当前状态 |
| `native.vpn.testLatency` | `{id, config}` | `{success, latency}` | 测试单个节点延迟 |
| `native.vpn.speedTest` | `{}` | `{success, download, upload, latency}` | 运行速度测试 |

### 权限相关

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `native.checkVpnPermissions` | `{}` | `{granted, reason?}` | 检查 VPN 权限 |
| `native.requestVpnPermissions` | `{}` | `{granted, reason?}` | 请求 VPN 权限 |

### 系统相关

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `native.getSystemInfo` | `{}` | `{...}` | 获取系统信息 |

---

## 📡 原生事件清单

所有原生发送的事件：

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `bridge-ready` | `{}` | JSBridge 初始化完成 |
| `vpn-status-changed` | `{connected, duration, currentNode?}` | VPN 连接状态改变 |
| `vpn-error` | `{code, message}` | VPN 发生错误 |
| `vpn-duration-update` | `number` (秒) | 连接时长更新（每秒）|
| `vpn-traffic-update` | `{upload, download}` | 流量统计更新（每秒）|
| `permission-result` | `{granted, reason?}` | 权限请求结果 |

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

## 🔐 Android 权限配置

在 `AndroidManifest.xml` 中添加以下权限：

```xml
<uses-permission android:name="android.permission.BIND_VPN_SERVICE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
```

---

## 🏗️ Android App 壳子实现指南

### 步骤 1: 创建 WebView 容器

```java
// MainActivity.java
package com.example.vpnapp;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        configureWebView();
        loadApplication();
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);  // 启用 LocalStorage
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // 注入 JSBridge 接口
        webView.addJavascriptInterface(
            new JSBridgeInterface(this),
            "VpnJSBridge"
        );
        
        // 设置 WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // 注入 handleWebMessage 全局函数
                injectJSHandler();
            }
        });
    }

    private void loadApplication() {
        // 从 assets 目录加载前端应用
        webView.loadUrl("file:///android_asset/dist/index.html");
    }

    private void injectJSHandler() {
        String js = "window.handleWebMessage = function(msg) {};";
        webView.evaluateJavascript(js, null);
    }
}
```

### 步骤 2: 实现 JSBridge 接口

```java
// JSBridgeInterface.java
package com.example.vpnapp;

import android.app.Activity;
import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.util.Log;
import org.json.JSONObject;
import org.json.JSONException;

public class JSBridgeInterface {
    private static final String TAG = "JSBridge";
    private Activity activity;
    private WebView webView;
    private VpnManager vpnManager;

    public JSBridgeInterface(Activity activity) {
        this.activity = activity;
        this.webView = activity.findViewById(R.id.webview);
        this.vpnManager = new VpnManager(activity);
    }

    /**
     * 接收来自前端的消息
     * 所有前端的 JSBridge 调用都会通过这个方法
     */
    @JavascriptInterface
    public void postMessage(String jsonMessage) {
        Log.d(TAG, "Received: " + jsonMessage);
        
        try {
            JSONObject msg = new JSONObject(jsonMessage);
            int messageId = msg.getInt("id");
            String method = msg.getString("method");
            JSONObject params = msg.optJSONObject("params");

            // 根据方法名分发处理
            handleNativeCall(messageId, method, params);
        } catch (JSONException e) {
            Log.e(TAG, "JSON parsing error", e);
        }
    }

    /**
     * 分发原生方法调用
     */
    private void handleNativeCall(int messageId, String method, JSONObject params) {
        Log.d(TAG, "Handling: " + method);
        
        switch (method) {
            case "native.vpn.connect":
                handleVpnConnect(messageId, params);
                break;
            case "native.vpn.disconnect":
                handleVpnDisconnect(messageId);
                break;
            case "native.vpn.getStatus":
                handleGetStatus(messageId);
                break;
            case "native.vpn.testLatency":
                handleTestLatency(messageId, params);
                break;
            case "native.vpn.speedTest":
                handleSpeedTest(messageId);
                break;
            case "native.checkVpnPermissions":
                handleCheckPermissions(messageId);
                break;
            case "native.requestVpnPermissions":
                handleRequestPermissions(messageId);
                break;
            case "native.getSystemInfo":
                handleGetSystemInfo(messageId);
                break;
            default:
                sendError(messageId, "Unknown method: " + method);
        }
    }

    /**
     * 处理 VPN 连接请求
     */
    private void handleVpnConnect(int messageId, JSONObject params) {
        try {
            String nodeId = params.getString("id");
            String nodeName = params.getString("name");
            String protocol = params.getString("protocol");
            JSONObject config = params.getJSONObject("config");

            Log.d(TAG, "Connecting to: " + nodeName + " (" + protocol + ")");

            vpnManager.connect(nodeId, protocol, config, (success, error) -> {
                if (success) {
                    sendCallback(messageId, true, null);
                    // 发送事件给前端
                    sendEvent("vpn-status-changed", "{\"connected\": true}");
                } else {
                    sendError(messageId, error);
                }
            });
        } catch (JSONException e) {
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 处理 VPN 断开连接请求
     */
    private void handleVpnDisconnect(int messageId) {
        Log.d(TAG, "Disconnecting VPN");
        
        vpnManager.disconnect((success, error) -> {
            if (success) {
                sendCallback(messageId, true, null);
                sendEvent("vpn-status-changed", "{\"connected\": false}");
            } else {
                sendError(messageId, error);
            }
        });
    }

    /**
     * 获取 VPN 状态
     */
    private void handleGetStatus(int messageId) {
        vpnManager.getStatus((connected, duration, traffic) -> {
            try {
                JSONObject data = new JSONObject();
                data.put("connected", connected);
                data.put("duration", duration);
                if (traffic != null) {
                    JSONObject t = new JSONObject();
                    t.put("upload", traffic[0]);
                    t.put("download", traffic[1]);
                    data.put("bytesTransferred", t);
                }
                sendCallback(messageId, data);
            } catch (JSONException e) {
                sendError(messageId, e.getMessage());
            }
        });
    }

    /**
     * 测试节点延迟
     */
    private void handleTestLatency(int messageId, JSONObject params) {
        try {
            String nodeId = params.getString("id");
            JSONObject config = params.getJSONObject("config");

            vpnManager.testLatency(config, (latency, error) -> {
                try {
                    if (error == null) {
                        JSONObject data = new JSONObject();
                        data.put("success", true);
                        data.put("latency", latency);
                        sendCallback(messageId, data);
                    } else {
                        sendError(messageId, error);
                    }
                } catch (JSONException e) {
                    sendError(messageId, e.getMessage());
                }
            });
        } catch (JSONException e) {
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 运行速度测试
     */
    private void handleSpeedTest(int messageId) {
        vpnManager.runSpeedTest((download, upload, latency, error) -> {
            try {
                if (error == null) {
                    JSONObject data = new JSONObject();
                    data.put("success", true);
                    data.put("download", download);
                    data.put("upload", upload);
                    data.put("latency", latency);
                    sendCallback(messageId, data);
                } else {
                    sendError(messageId, error);
                }
            } catch (JSONException e) {
                sendError(messageId, e.getMessage());
            }
        });
    }

    /**
     * 检查权限
     */
    private void handleCheckPermissions(int messageId) {
        boolean granted = vpnManager.checkPermissions(activity);
        try {
            JSONObject data = new JSONObject();
            data.put("granted", granted);
            sendCallback(messageId, data);
        } catch (JSONException e) {
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 请求权限
     */
    private void handleRequestPermissions(int messageId) {
        vpnManager.requestPermissions(activity, (granted) -> {
            try {
                JSONObject data = new JSONObject();
                data.put("granted", granted);
                sendCallback(messageId, data);
            } catch (JSONException e) {
                sendError(messageId, e.getMessage());
            }
        });
    }

    /**
     * 获取系统信息
     */
    private void handleGetSystemInfo(int messageId) {
        try {
            JSONObject info = new JSONObject();
            info.put("osVersion", android.os.Build.VERSION.SDK_INT);
            info.put("manufacturer", android.os.Build.MANUFACTURER);
            info.put("model", android.os.Build.MODEL);
            sendCallback(messageId, info);
        } catch (JSONException e) {
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 发送回调给前端
     */
    private void sendCallback(int messageId, Object data) {
        try {
            JSONObject callback = new JSONObject();
            callback.put("type", "callback");
            callback.put("id", messageId);
            callback.put("data", data instanceof JSONObject ? data : new JSONObject(data.toString()));
            
            String jsCode = "window.handleWebMessage(" + callback.toString() + ")";
            executeJS(jsCode);
        } catch (JSONException e) {
            Log.e(TAG, "sendCallback error", e);
        }
    }

    /**
     * 发送错误给前端
     */
    private void sendError(int messageId, String error) {
        try {
            JSONObject callback = new JSONObject();
            callback.put("type", "callback");
            callback.put("id", messageId);
            callback.put("error", error);
            
            String jsCode = "window.handleWebMessage(" + callback.toString() + ")";
            executeJS(jsCode);
        } catch (JSONException e) {
            Log.e(TAG, "sendError error", e);
        }
    }

    /**
     * 发送事件给前端
     */
    private void sendEvent(String eventName, String jsonData) {
        try {
            JSONObject event = new JSONObject();
            event.put("type", "event");
            event.put("name", eventName);
            event.put("data", new JSONObject(jsonData));
            
            String jsCode = "window.handleNativeMessage(" + event.toString() + ")";
            executeJS(jsCode);
        } catch (JSONException e) {
            Log.e(TAG, "sendEvent error", e);
        }
    }

    /**
     * 在 UI 线程上执行 JavaScript
     */
    private void executeJS(String jsCode) {
        activity.runOnUiThread(() -> {
            Log.d(TAG, "Executing JS: " + jsCode.substring(0, Math.min(100, jsCode.length())));
            webView.evaluateJavascript(jsCode, null);
        });
    }
}
```

### 步骤 3: 实现 VPN 管理器

```java
// VpnManager.java
package com.example.vpnapp;

import android.app.Activity;
import android.content.Context;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import org.json.JSONObject;
import org.json.JSONException;
import java.io.*;
import java.net.Socket;
import java.net.InetSocketAddress;

public class VpnManager {
    private static final String TAG = "VpnManager";
    private Context context;
    private VpnService.Builder vpnBuilder;
    private ParcelFileDescriptor vpnInterface;
    private boolean isConnected = false;
    private long connectionStartTime = 0;

    public VpnManager(Context context) {
        this.context = context;
    }

    /**
     * 连接到 VPN
     */
    public void connect(String nodeId, String protocol, JSONObject config,
                       ConnectCallback callback) {
        new Thread(() -> {
            try {
                // 1. 根据协议类型处理配置
                String host = config.optString("host");
                int port = config.optInt("port", 443);
                String sni = config.optString("sni", host);

                Log.d(TAG, "Connecting to: " + host + ":" + port);

                // 2. 创建 VPN 连接
                vpnBuilder = new VpnService.Builder();
                vpnBuilder.setSession("VPN")
                    .addAddress("10.0.0.1", 24)
                    .addRoute("0.0.0.0", 0)
                    .addSearchDomain(".");

                // 3. 建立连接
                vpnInterface = vpnBuilder.establish();
                
                if (vpnInterface != null) {
                    isConnected = true;
                    connectionStartTime = System.currentTimeMillis();
                    callback.onCallback(true, null);
                    
                    // 启动数据转发线程
                    startDataForwarding();
                } else {
                    callback.onCallback(false, "Failed to establish VPN");
                }
            } catch (Throwable e) {
                Log.e(TAG, "Connect error", e);
                callback.onCallback(false, e.getMessage());
            }
        }).start();
    }

    /**
     * 断开连接
     */
    public void disconnect(ConnectCallback callback) {
        new Thread(() -> {
            try {
                if (vpnInterface != null) {
                    vpnInterface.close();
                    vpnInterface = null;
                }
                isConnected = false;
                callback.onCallback(true, null);
            } catch (IOException e) {
                Log.e(TAG, "Disconnect error", e);
                callback.onCallback(false, e.getMessage());
            }
        }).start();
    }

    /**
     * 获取 VPN 状态
     */
    public void getStatus(StatusCallback callback) {
        long duration = isConnected ? (System.currentTimeMillis() - connectionStartTime) / 1000 : 0;
        // 这里可以获取真实的流量统计
        long[] traffic = {0, 0}; // {upload, download}
        callback.onCallback(isConnected, (int) duration, traffic);
    }

    /**
     * 测试延迟
     */
    public void testLatency(JSONObject config, LatencyCallback callback) {
        new Thread(() -> {
            try {
                String host = config.optString("host");
                int port = config.optInt("port", 443);

                Socket socket = new Socket();
                long startTime = System.currentTimeMillis();

                socket.connect(new InetSocketAddress(host, port), 5000);
                long latency = System.currentTimeMillis() - startTime;

                socket.close();
                callback.onCallback((int) latency, null);
            } catch (Exception e) {
                Log.w(TAG, "Latency test failed", e);
                callback.onCallback(-1, e.getMessage());
            }
        }).start();
    }

    /**
     * 运行速度测试
     */
    public void runSpeedTest(SpeedTestCallback callback) {
        new Thread(() -> {
            try {
                // 模拟速度测试（实际应下载文件测试）
                double download = 20 + Math.random() * 80;
                double upload = 5 + Math.random() * 40;
                int latency = 20 + (int)(Math.random() * 60);

                callback.onCallback(download, upload, latency, null);
            } catch (Exception e) {
                callback.onCallback(0, 0, 0, e.getMessage());
            }
        }).start();
    }

    /**
     * 检查权限
     */
    public boolean checkPermissions(Activity activity) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            int permission = activity.checkSelfPermission(
                android.Manifest.permission.BIND_VPN_SERVICE
            );
            return permission == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    /**
     * 请求权限
     */
    public void requestPermissions(Activity activity, PermissionCallback callback) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            activity.requestPermissions(
                new String[]{android.Manifest.permission.BIND_VPN_SERVICE},
                100
            );
        }
        callback.onCallback(true);
    }

    /**
     * 启动数据转发
     */
    private void startDataForwarding() {
        new Thread(() -> {
            try {
                // 这里实现实际的数据转发逻辑
                // 可以使用 Socket 或其他机制进行转发
                while (isConnected) {
                    Thread.sleep(1000);
                    // 定期更新状态、发送事件等
                }
            } catch (InterruptedException e) {
                Log.d(TAG, "Data forwarding stopped");
            }
        }).start();
    }

    // 回调接口
    interface ConnectCallback {
        void onCallback(boolean success, String error);
    }

    interface StatusCallback {
        void onCallback(boolean connected, int duration, long[] traffic);
    }

    interface LatencyCallback {
        void onCallback(int latency, String error);
    }

    interface SpeedTestCallback {
        void onCallback(double download, double upload, int latency, String error);
    }

    interface PermissionCallback {
        void onCallback(boolean granted);
    }
}
```

### 步骤 4: WebView 布局文件

```xml
<!-- activity_main.xml -->
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</LinearLayout>
```

## 📋 常见问题排查

### 问题 1: "JSBridge: Waiting for Android WebView bridge injection"

**原因：** WebView 还未加载完成或 JSBridge 接口未正确注入
**解决：**
1. 确保在 WebView 加载前调用 `addJavascriptInterface()`
2. 在 WebView 页面加载完成后，通过 `evaluateJavascript()` 注入处理函数
3. 检查 WebView 的 `WebViewClient.onPageFinished()` 是否被调用

### 问题 2: "JSBridge timeout: native.vpn.connect"

**原因：** 原生代码超过 30 秒未返回结果
**解决：**
1. 检查原生代码中的长时间阻塞操作
2. 确保在后台线程执行网络操作（不要在 UI 线程）
3. 增加超时时间（修改 jsbridge.ts 中的 30000）：
   ```typescript
   timeout: window.setTimeout(() => {
     // 改成 60000（60秒）
   }, 60000),
   ```

### 问题 3: "Failed to handle native message: Unexpected token"

**原因：** 原生代码发送的 JSON 格式不正确
**解决：**
```java
// 检查以下几点：
// 1. JSON 对象必须合法
JSONObject msg = new JSONObject();
msg.put("type", "callback");
msg.put("id", messageId);
msg.put("data", data);  // data 必须是 JSONObject，不能是 String

// 2. 字符串化
String jsCode = "window.handleWebMessage(" + msg.toString() + ")";

// 3. 检查特殊字符是否正确转义
```

### 问题 4: 前端收不到原生事件

**原因：** 原生代码的事件发送有误，或前端未正确监听
**解决：**
```typescript
// 确保前端正确监听
jsbridge.on('vpn-status-changed', (data) => {
  console.log('Event received:', data);
});

// 原生代码发送事件时，数据必须是合法 JSON
JSONObject event = new JSONObject();
event.put("type", "event");
event.put("name", "vpn-status-changed");
event.put("data", statusData);  // statusData 必须是 JSONObject

webView.evaluateJavascript(
  "window.handleNativeMessage(" + event.toString() + ")",
  null
);
```

---

## 🚀 部署清单

### 开发阶段

- [ ] 在浏览器测试（localhost 模式）
  ```bash
  npm run dev
  ```

- [ ] 检查所有 JSBridge 消息日志
  ```typescript
  // 在 jsbridge.ts 中添加日志
  console.log('[JSBridge] Calling:', method);
  console.log('[JSBridge] Response:', result);
  ```

- [ ] 测试所有原生方法
  - [ ] native.vpn.connect
  - [ ] native.vpn.disconnect
  - [ ] native.vpn.getStatus
  - [ ] native.vpn.testLatency
  - [ ] native.vpn.speedTest
  - [ ] native.checkVpnPermissions
  - [ ] native.requestVpnPermissions

### 打包部署

1. **前端打包**
   ```bash
   npm run build
   # 输出到 dist/ 文件夹
   ```

2. **复制到 Android 项目**
   ```bash
   # 复制 dist/* 到 Android 项目的 assets/dist/ 目录
   cp -r dist/* ../android-project/app/src/main/assets/dist/
   ```

3. **检查权限配置** (AndroidManifest.xml)
   ```xml
   <uses-permission android:name="android.permission.BIND_VPN_SERVICE" />
   <uses-permission android:name="android.permission.INTERNET" />
   ```

4. **编译 Android 应用**
   ```bash
   ./gradlew build
   ```

5. **安装并测试**
   ```bash
   ./gradlew installDebug
   adb logcat JSBridge:* *:S  # 查看 JSBridge 日志
   ```

---

## 🧪 测试场景

### 场景 1: 浏览器测试（Mock 模式）

```bash
# 1. 启动开发服务器
npm run dev

# 2. 打开浏览器
# http://localhost:3001

# 3. 点击"连接"按钮
# 应该显示加载中，然后显示连接成功（使用 Mock 数据）
```

### 场景 2: App 测试（真实模式）

```
1. 打包前端应用 (npm run build)
2. 复制到 App 项目中
3. 在 Android Studio 中运行应用
4. 点击"连接"按钮
5. 期望：实际的 VPN 连接发生，系统 VPN 设置被修改
```

### 场景 3: 调试 JSBridge

打开 Chrome DevTools 远程调试：

```
1. 在 Android 开发者选项中启用 USB 调试
2. 在 Android Studio 中运行应用
3. 在 Chrome 中打开 chrome://inspect/#devices
4. 找到你的应用，点击 inspect
5. 在 Console 中看日志和错误
```

---

## 📊 生产环境建议

1. **日志管理**
   - 在生产环境中关闭 JSBridge 日志
   - 或将日志保存到本地，定期上传到服务器分析

2. **错误处理**
   - 给用户显示友好的错误信息
   - 不要直接显示技术错误到 UI

3. **版本控制**
   - 记录 App 壳子和 React 前端的版本号
   - 确保兼容性

4. **性能优化**
   - VPN 测试操作应在后台进行（不阻塞 UI）
   - 大的 JSON 数据应考虑压缩

5. **安全**
   - 验证所有来自原生的数据
   - 不要通过 JSBridge 传输敏感信息（密码等）
   - 使用 HTTPS 加载前端应用

---

## 🎉 完成！

JSBridge 集成完毕，现在你的应用已经准备好进行原生 VPN 功能集成。
