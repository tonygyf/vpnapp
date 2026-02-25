# App 壳子集成方案

完整的 VPN 应用架构方案，将前端 React 应用与原生 VPN 功能集成。

---

## 🏗️ 总体架构

### 三层模型

```
┌─────────────────────────────────────────┐
│  前端 UI Layer (React)                   │
│  - HomeView / ServersView / SpeedView    │
│  - 完整的 VPN 管理界面                    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  业务逻辑 Layer (Services & Hooks)       │
│  - useVpnViewModel (MVVM 状态)           │
│  - useVpnBridge (Bridge 操作)            │
│  - subscriptionService (订阅管理)        │
│  - vpnBridgeService (VPN 操作)           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  JSBridge Layer (通信)                   │
│  - jsbridge.ts (消息收发)                │
│  - 双向通信 (JS ↔ Native)               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  原生 App 壳子 (Android/iOS)            │
│  - VPN 服务实现                          │
│  - 系统权限管理                          │
│  - 网络连接                              │
│  - 真实延迟测试                          │
└─────────────────────────────────────────┘
```

---

## 📦 核心功能

### 1. VPN 连接管理

```typescript
// 前端代码（自动处理）
const vm = useVpnViewModel();

// 连接到节点
await vm.connect();  // ← 调用原生 VPN 连接

// 断开连接
await vm.disconnect();  // ← 调用原生 VPN 断开

// 获取状态
const status = await mockVpnService.getVpnStatus();
// {
//   connected: true,
//   duration: 3600,  // 连接秒数
//   bytesTransferred: { upload: 1024, download: 5120 }
// }
```

### 2. 订阅链接管理

```typescript
// 导入 v2rayn 订阅链接
await vm.importSubscription('https://example.com/subscribe?token=xxx');

// 自动：
// 1. 获取订阅内容（base64 解码）
// 2. 逐行解析节点（vless/vmess/trojan）
// 3. 本地 LocalStorage 缓存
// 4. 每天自动更新

// 手动更新
await vm.updateAllSubscriptions();

// 删除订阅
vm.removeSubscription(url);
```

### 3. 速度测试

```typescript
// 前端请求
await vm.runSpeedTest();

// 如果 JSBridge 可用 → 调用原生真实测试
// 否则 → Mock 数据（浏览器环境）

// 结果：{ download, upload, latency }
```

### 4. 延迟测试

```typescript
// 单个节点
const latency = await vpnBridgeService.testLatency(node);

// 批量节点
const results = await mockVpnService.testMultipleLatencies(nodes);
```

---

## 🔧 实现细节

### App 启动流程

```
1. React 挂载 App.tsx
   ↓
2. JSBridge 初始化
   ├─ Android: 检测 window.VpnJSBridge
   └─ iOS: 检测 webkit.messageHandlers.vpnBridge
   ↓
3. Bridge 就绪事件
   ├─ Ready: 使用原生 VPN 功能
   └─ Not Ready: 回退到 Mock 模式
   ↓
4. useVpnViewModel 初始化
   ├─ 加载已保存的订阅
   ├─ 监听原生 VPN 状态变化
   └─ 准备就绪
```

### 双模式支持

**App 模式**（运行在原生 App 中）
```
  用户操作 → React UI → VPN Bridge → JSBridge → 原生代码 → 系统 VPN 设置
                          ↓
                    真实 VPN 连接
```

**浏览器模式**（开发/测试）
```
  用户操作 → React UI → VPN Bridge → JSBridge（无响应）
                          ↓
                    自动降级到 Mock
                    ↓
                  模拟延迟、随机数据
```

---

## 🚀 部署到 App 壳子

### 步骤 1: 前端打包

```bash
cd d:\typer\android_demo\vpnapp
npm run build
```

生成 `dist` 文件夹，包含：
- `index.html` - 主页面
- `assets/` - 捆绑的 JS/CSS

### 步骤 2: Android 集成

**1. 创建 WebView 容器**

```java
// MainActivity.java
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        setupWebView();
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);  // LocalStorage 支持
        
        // 注入 JSBridge 接口
        webView.addJavascriptInterface(new JSBridgeInterface(this), "VpnJSBridge");
        
        // 加载前端应用
        webView.loadUrl("file:///android_asset/dist/index.html");
    }
}
```

**2. 实现 JSBridge 接口**

```java
// JSBridgeInterface.java
public class JSBridgeInterface {
    private VpnManager vpnManager;
    private Activity activity;
    private WebView webView;

    public JSBridgeInterface(Activity activity) {
        this.activity = activity;
        this.vpnManager = new VpnManager(activity);
    }

    @JavascriptInterface
    public void postMessage(String jsonMessage) {
        try {
            JSONObject msg = new JSONObject(jsonMessage);
            int messageId = msg.getInt("id");
            String method = msg.getString("method");
            JSONObject params = msg.optJSONObject("params");

            handleNativeCall(messageId, method, params);
        } catch (JSONException e) {
            Log.e("JSBridge", "Parse error", e);
        }
    }

    private void handleNativeCall(int messageId, String method, JSONObject params) {
        switch(method) {
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
            // ... 其他方法
        }
    }

    private void handleVpnConnect(int messageId, JSONObject params) {
        try {
            String nodeId = params.getString("id");
            String protocol = params.getString("protocol");
            JSONObject config = params.getJSONObject("config");

            vpnManager.connect(nodeId, protocol, config, success -> {
                sendCallback(messageId, success);
            });
        } catch (JSONException e) {
            sendError(messageId, e.getMessage());
        }
    }

    private void sendCallback(int messageId, boolean success) {
        String jsCode = String.format(
            "window.handleWebMessage({type:'callback',id:%d,data:{success:%b}})",
            messageId, success
        );
        runOnUiThread(() -> webView.evaluateJavascript(jsCode, null));
    }

    private void sendEvent(String eventName, Object data) {
        try {
            JSONObject event = new JSONObject();
            event.put("type", "event");
            event.put("name", eventName);
            event.put("data", new JSONObject(new Gson().toJson(data)));

            String jsCode = "window.handleNativeMessage(" + event.toString() + ")";
            runOnUiThread(() -> webView.evaluateJavascript(jsCode, null));
        } catch (JSONException e) {
            Log.e("JSBridge", "Send event error", e);
        }
    }

    // ... 其他实现
}
```

**3. VPN 服务实现**

```java
// VpnManager.java
public class VpnManager {
    private VpnService.Builder builder;
    private ParcelFileDescriptor vpnInterface;

    public void connect(String nodeId, String protocol, JSONObject config, 
                        BiConsumer<Boolean, String> callback) {
        // 1. 解析配置
        String host = config.optString("host");
        int port = config.optInt("port", 443);
        String sni = config.optString("sni", host);

        // 2. 建立 VPN 连接
        try {
            // 根据协议类型处理（vless/vmess/trojan）
            if ("vless".equals(protocol)) {
                connectVless(host, port, sni, config);
            } else if ("vmess".equals(protocol)) {
                connectVmess(host, port, config);
            } else if ("trojan".equals(protocol)) {
                connectTrojan(host, port, sni, config);
            }

            // 3. 设置路由
            builder.addAddress("10.0.0.1", 24);
            builder.addSearchDomain(".");  // 所有域名走 VPN
            builder.addRoute("0.0.0.0", 0);  // 所有流量

            // 4. 建立连接
            vpnInterface = builder.establish();
            
            // 5. 启动数据转发（这里是简化，实际需要 Socket 转发）
            callback.accept(true, null);
            
            // 发送 VPN 状态事件
            sendEvent("vpn-status-changed", new Object() {
                public boolean connected = true;
                public int duration = 0;
            });

        } catch (Exception e) {
            callback.accept(false, e.getMessage());
        }
    }

    public void disconnect() {
        if (vpnInterface != null) {
            try {
                vpnInterface.close();
                vpnInterface = null;
            } catch (IOException e) {
                Log.e("VPN", "Close error", e);
            }
        }
    }

    public void testLatency(String host, int port, Consumer<Integer> callback) {
        new Thread(() -> {
            try {
                Socket socket = new Socket();
                long startTime = System.currentTimeMillis();
                
                socket.connect(new InetSocketAddress(host, port), 5000);
                long latency = System.currentTimeMillis() - startTime;
                
                socket.close();
                callback.accept((int) latency);
            } catch (Exception e) {
                callback.accept(-1); // 测试失败
            }
        }).start();
    }

    // 类似的 connectVless, connectVmess, connectTrojan 实现...
}
```

### 步骤 3: iOS 集成

**1. WebView 配置**

```swift
// ViewController.swift
import WebKit

class ViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
    }

    func setupWebView() {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        
        // 注册 JSBridge 消息处理
        controller.add(self, name: "vpnBridge")
        config.userContentController = controller
        
        // 启用 LocalStorage
        config.websiteDataStore = WKWebsiteDataStore.default()
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        view.addSubview(webView)
        
        // 加载前端应用
        let htmlPath = Bundle.main.path(forResource: "dist/index", ofType: "html")!
        let htmlURL = URL(fileURLWithPath: htmlPath)
        webView.load(URLRequest(url: htmlURL))
    }

    // JSBridge 消息处理
    func userContentController(_ userContentController: WKUserContentController,
                              didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        
        let messageId = body["id"] as? Int ?? 0
        let method = body["method"] as? String ?? ""
        let params = body["params"] as? [String: Any] ?? [:]

        VpnBridgeHandler.handle(method: method, params: params, messageId: messageId) { result in
            self.sendCallback(messageId: messageId, data: result)
        }
    }

    func sendCallback(messageId: Int, data: Any) {
        let response = [
            "type": "callback",
            "id": messageId,
            "data": data
        ] as [String : Any]
        
        do {
            let json = try JSONSerialization.data(withJSONObject: response)
            let jsonString = String(data: json, encoding: .utf8) ?? ""
            let script = "window.handleNativeMessage(\(jsonString))"
            
            webView.evaluateJavaScript(script)
        } catch {
            print("JSON encode error", error)
        }
    }
}
```

**2. VPN 服务实现**

```swift
// VpnManager.swift
import NetworkExtension

class VpnManager {
    static let shared = VpnManager()
    
    func connect(config: [String: Any], callback: @escaping (Bool, String?) -> Void) {
        // 1. 检查权限
        guard NEVPNManager.shared().isEnabled else {
            requestVpnPermission { granted in
                if granted {
                    self.connect(config: config, callback: callback)
                } else {
                    callback(false, "VPN permission denied")
                }
            }
            return
        }

        // 2. 创建 VPN 配置
        let settings = NEVPNSettings()
        settings.isEnabled = true

        // 根据协议类型创建不同的 VPN 配置
        let protocol = config["protocol"] as? String ?? "vless"
        
        if protocol == "vless" {
            createVlessConfig(config: config, settings: settings)
        } else if protocol == "vmess" {
            createVmessConfig(config: config, settings: settings)
        }

        // 3. 应用配置
        try? NEVPNManager.shared().saveToPreferences()
        try? NEVPNManager.shared().loadFromPreferences()
        try? NEVPNManager.shared().connection.startVPNTunnel()

        callback(true, nil)
    }

    func disconnect(callback: @escaping (Bool) -> Void) {
        NEVPNManager.shared().connection.stopVPNTunnel()
        callback(true)
    }

    func testLatency(host: String, port: Int, callback: @escaping (Int?) -> Void) {
        let socket = CFSocketCreate(kCFAllocatorDefault, PF_INET, SOCK_STREAM, IPPROTO_TCP, 0, nil)
        let startTime = Date()

        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(port).bigEndian
        
        // 转换 host 地址
        if let hostRef = CFSocketCreateConnectToHost(kCFAllocatorDefault, host as CFString, UInt16(port), nil) {
            let latency = Int(Date().timeIntervalSince(startTime) * 1000)
            CFSocketInvalidate(hostRef)
            callback(latency)
        } else {
            callback(nil)
        }
    }

    private func requestVpnPermission(callback: @escaping (Bool) -> Void) {
        // iOS 会自动提示用户
        callback(true)
    }

    private func createVlessConfig(config: [String: Any], settings: NEVPNSettings) {
        // VLESS 配置实现
        // 使用第三方库如 NEKit 或自己实现协议
    }

    private func createVmessConfig(config: [String: Any], settings: NEVPNSettings) {
        // VMESS 配置实现
    }
}
```

### 步骤 4: 配置打包

**resources/manifest (Android)**
```xml
<!-- android:versionCode 增加 -->
<!-- permissions 添加 -->
<uses-permission android:name="android.permission.BIND_VPN_SERVICE" />
<uses-permission android:name="android.permission.INTERNET" />
<!-- WebView 配置 -->
<meta-data android:name="android.webkit.WebView.EnableSafeBrowsing"
           android:value="false" />
```

**Info.plist (iOS)**
```xml
<key>NSLocalNetworkUsageDescription</key>
<string>Need local network for VPN</string>
<key>NSBonjourServices</key>
<array>
    <string>_vpn._tcp</string>
</array>
```

---

## 🧪 测试

### 浏览器测试（Mock 模式）

```bash
npm run dev
# 打开 http://localhost:3001
# 所有操作使用 Mock 数据
```

### App 测试（真实模式）

1. 打包前端：`npm run build`
2. 集成到 App 壳子
3. 编译并运行 App
4. 所有操作调用原生 VPN 功能

---

## 📊 状态同步

### 原生 → 前端（事件）

原生代码需要定期发送事件到前端：

```typescript
// 连接状态变化
sendEvent('vpn-status-changed', {
  connected: boolean,
  duration: number,  // 秒
});

// VPN 错误
sendEvent('vpn-error', {
  code: 'ERROR_CODE',
  message: 'Error message'
});

// 流量更新（每秒）
sendEvent('vpn-traffic-update', {
  upload: bytes,
  download: bytes
});

// 连接时长更新（每秒）
sendEvent('vpn-duration-update', duration);
```

---

## 🎉 完成！

现在你的应用已经完全准备好与原生 App 壳子集成。

**下一步：**
1. 准备 v2rayn 订阅链接进行测试
2. 完成 Android/iOS 原生 VPN 实现
3. 集成打包部署

