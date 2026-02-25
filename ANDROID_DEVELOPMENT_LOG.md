# Android App 壳子开发指南日志

**最后更新：** 2026年2月25日

---

## 🎯 开发目标

使用 Android WebView 托管前端 React 应用，通过 JSBridge 与原生 VPN 功能通信，实现完整的 VPN 连接、速度测试、订阅管理等功能。

---

## 📋 前置准备

### 开发环境
- [ ] Android Studio 最新版本
- [ ] Android SDK 28+ (API Level)
- [ ] Gradle 8.0+
- [ ] Java 11+

### 项目结构
```
android-vpn-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/vpnapp/
│   │   │   │   ├── MainActivity.java
│   │   │   │   ├── JSBridgeInterface.java
│   │   │   │   └── VpnManager.java
│   │   │   ├── assets/
│   │   │   │   └── dist/              ← 前端打包输出
│   │   │   │       ├── index.html
│   │   │   │       └── assets/
│   │   │   └── AndroidManifest.xml
│   │   └── res/
│   │       └── layout/
│   │           └── activity_main.xml
│   └── build.gradle
└── build.gradle
```

---

## 🚀 第一步：创建 Android 项目

### 1.1 在 Android Studio 中创建新项目

```
File → New → New Project
  - 选择 "Empty Activity"
  - Project name: "android-vpn-app"
  - Package name: "com.example.vpnapp"
  - Minimum SDK: API 28
```

### 1.2 修改 build.gradle (Module: app)

```gradle
android {
    compileSdk 34

    defaultConfig {
        applicationId "com.example.vpnapp"
        minSdk 28
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildFeatures {
        viewBinding true
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}
```

---

## 🔧 第二步：配置 WebView

### 2.1 修改 AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.example.vpnapp">

    <!-- 权限声明 -->
    <uses-permission android:name="android.permission.BIND_VPN_SERVICE" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:debuggable="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.AndroidVpnApp">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@android:style/Theme.Black.NoTitleBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
```

### 2.2 修改 activity_main.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:id="@+id/main"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    tools:context=".MainActivity">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</LinearLayout>
```

### 2.3 创建 MainActivity.java

```java
package com.example.vpnapp;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Log.d(TAG, "MainActivity created");

        // 初始化 WebView
        initWebView();

        // 加载应用
        loadApplication();
    }

    private void initWebView() {
        webView = findViewById(R.id.webview);

        // 配置 WebView 设置
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);      // LocalStorage
        settings.setDatabaseEnabled(true);         // Web SQL
        settings.setAppCacheEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // 注入 JSBridge 接口
        Log.d(TAG, "Injecting JSBridge interface...");
        webView.addJavascriptInterface(
            new JSBridgeInterface(this),
            "VpnJSBridge"
        );

        // 设置 WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d(TAG, "Page finished: " + url);
                
                // 注入 JavaScript 处理函数
                injectGlobalHandlers();
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                Log.e(TAG, "WebView error [" + errorCode + "]: " + description);
            }
        });

        // 启用调试（仅在开发时）
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    /**
     * 注入全局 JavaScript 处理函数
     * 前端通过这些函数接收来自原生的消息
     */
    private void injectGlobalHandlers() {
        String jsCode = "if (!window.handleWebMessage) { " +
            "window.handleWebMessage = function(msg) { " +
                "console.log('[WebMessage]', msg); " +
            "}; " +
        "} " +
        "if (!window.handleNativeMessage) { " +
            "window.handleNativeMessage = function(msg) { " +
                "console.log('[NativeMessage]', msg); " +
            "}; " +
        "}";

        webView.evaluateJavascript(jsCode, null);
        Log.d(TAG, "Global handlers injected");
    }

    private void loadApplication() {
        // 从 assets 中加载 index.html
        webView.loadUrl("file:///android_asset/dist/index.html");
        Log.d(TAG, "Loading application from assets");
    }

    /**
     * 在 WebView 中执行 JavaScript 代码（安全包装）
     */
    public void evaluateJavaScript(String jsCode) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            webView.evaluateJavascript(jsCode, null);
        } else {
            webView.loadUrl("javascript:" + jsCode);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
```

---

## 🌉 第三步：实现 JSBridge 接口

### 3.1 创建 JSBridgeInterface.java

这是前端和原生之间的通信入口。

```java
package com.example.vpnapp;

import android.app.Activity;
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
        
        Log.d(TAG, "JSBridgeInterface initialized");
    }

    /**
     * 接收来自前端的所有消息
     * 前端通过 window.VpnJSBridge.postMessage(jsonString) 调用
     */
    @JavascriptInterface
    public void postMessage(String jsonMessage) {
        Log.d(TAG, "📨 Received from JS: " + jsonMessage);

        try {
            JSONObject msg = new JSONObject(jsonMessage);
            int messageId = msg.getInt("id");
            String method = msg.getString("method");
            JSONObject params = msg.optJSONObject("params");

            Log.d(TAG, "  Method: " + method);
            Log.d(TAG, "  Message ID: " + messageId);

            // 分发处理
            handleNativeCall(messageId, method, params);
        } catch (JSONException e) {
            Log.e(TAG, "JSON parsing error: " + e.getMessage());
        }
    }

    /**
     * 分发原生方法调用
     */
    private void handleNativeCall(int messageId, String method, JSONObject params) {
        Log.d(TAG, "🔄 Handling: " + method);

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
                Log.w(TAG, "⚠️ Unknown method: " + method);
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

            Log.d(TAG, "  Node: " + nodeName + " (" + protocol + ")");

            vpnManager.connect(nodeId, protocol, config, new VpnManager.ConnectCallback() {
                @Override
                public void onCallback(boolean success, String error) {
                    if (success) {
                        Log.d(TAG, "✅ VPN connected");
                        sendCallback(messageId, true, null);
                        sendEvent("vpn-status-changed", "{\"connected\": true, \"duration\": 0}");
                    } else {
                        Log.e(TAG, "❌ VPN connection failed: " + error);
                        sendError(messageId, error);
                    }
                }
            });
        } catch (JSONException e) {
            Log.e(TAG, "Parse error in handleVpnConnect", e);
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 处理 VPN 断开连接请求
     */
    private void handleVpnDisconnect(int messageId) {
        Log.d(TAG, "  Disconnecting VPN...");

        vpnManager.disconnect(new VpnManager.ConnectCallback() {
            @Override
            public void onCallback(boolean success, String error) {
                if (success) {
                    Log.d(TAG, "✅ VPN disconnected");
                    sendCallback(messageId, true, null);
                    sendEvent("vpn-status-changed", "{\"connected\": false, \"duration\": 0}");
                } else {
                    Log.e(TAG, "❌ VPN disconnection failed: " + error);
                    sendError(messageId, error);
                }
            }
        });
    }

    /**
     * 获取 VPN 状态
     */
    private void handleGetStatus(int messageId) {
        vpnManager.getStatus(new VpnManager.StatusCallback() {
            @Override
            public void onCallback(boolean connected, int duration, long[] traffic) {
                try {
                    JSONObject status = new JSONObject();
                    status.put("connected", connected);
                    status.put("duration", duration);
                    
                    if (traffic != null) {
                        JSONObject t = new JSONObject();
                        t.put("upload", traffic[0]);
                        t.put("download", traffic[1]);
                        status.put("bytesTransferred", t);
                    }
                    
                    sendCallback(messageId, status);
                    Log.d(TAG, "✅ Status: " + (connected ? "connected" : "disconnected") + ", duration: " + duration);
                } catch (JSONException e) {
                    sendError(messageId, e.getMessage());
                }
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

            Log.d(TAG, "  Testing latency for node: " + nodeId);

            vpnManager.testLatency(config, new VpnManager.LatencyCallback() {
                @Override
                public void onCallback(int latency, String error) {
                    try {
                        if (error == null) {
                            JSONObject data = new JSONObject();
                            data.put("success", true);
                            data.put("latency", latency);
                            sendCallback(messageId, data);
                            Log.d(TAG, "✅ Latency: " + latency + "ms");
                        } else {
                            Log.w(TAG, "⚠️ Latency test failed: " + error);
                            sendError(messageId, error);
                        }
                    } catch (JSONException e) {
                        sendError(messageId, e.getMessage());
                    }
                }
            });
        } catch (JSONException e) {
            Log.e(TAG, "Parse error in handleTestLatency", e);
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 运行速度测试
     */
    private void handleSpeedTest(int messageId) {
        Log.d(TAG, "  Running speed test...");

        vpnManager.runSpeedTest(new VpnManager.SpeedTestCallback() {
            @Override
            public void onCallback(double download, double upload, int latency, String error) {
                try {
                    if (error == null) {
                        JSONObject data = new JSONObject();
                        data.put("success", true);
                        data.put("download", download);
                        data.put("upload", upload);
                        data.put("latency", latency);
                        sendCallback(messageId, data);
                        Log.d(TAG, String.format(
                            "✅ Speed: %.1f Mbps ↓, %.1f Mbps ↑, %dms latency",
                            download, upload, latency
                        ));
                    } else {
                        Log.e(TAG, "❌ Speed test failed: " + error);
                        sendError(messageId, error);
                    }
                } catch (JSONException e) {
                    sendError(messageId, e.getMessage());
                }
            }
        });
    }

    /**
     * 检查 VPN 权限
     */
    private void handleCheckPermissions(int messageId) {
        boolean granted = vpnManager.checkPermissions(activity);
        try {
            JSONObject data = new JSONObject();
            data.put("granted", granted);
            sendCallback(messageId, data);
            Log.d(TAG, "VPN permission: " + (granted ? "granted" : "denied"));
        } catch (JSONException e) {
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 请求 VPN 权限
     */
    private void handleRequestPermissions(int messageId) {
        vpnManager.requestPermissions(activity, new VpnManager.PermissionCallback() {
            @Override
            public void onCallback(boolean granted) {
                try {
                    JSONObject data = new JSONObject();
                    data.put("granted", granted);
                    sendCallback(messageId, data);
                    Log.d(TAG, "Permission request result: " + (granted ? "granted" : "denied"));
                } catch (JSONException e) {
                    sendError(messageId, e.getMessage());
                }
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
            info.put("brand", android.os.Build.BRAND);
            sendCallback(messageId, info);
            Log.d(TAG, "System info: " + info.toString());
        } catch (JSONException e) {
            sendError(messageId, e.getMessage());
        }
    }

    /**
     * 发送成功回调给前端
     */
    private void sendCallback(int messageId, Object data) {
        try {
            JSONObject callback = new JSONObject();
            callback.put("type", "callback");
            callback.put("id", messageId);

            if (data instanceof JSONObject) {
                callback.put("data", data);
            } else if (data instanceof Boolean) {
                JSONObject d = new JSONObject();
                d.put("success", data);
                callback.put("data", d);
            } else {
                callback.put("data", data);
            }

            executeJS("window.handleWebMessage(" + callback.toString() + ")");
            Log.d(TAG, "📤 Sent callback [ID:" + messageId + "]");
        } catch (JSONException e) {
            Log.e(TAG, "sendCallback error", e);
        }
    }

    /**
     * 发送错误回调给前端
     */
    private void sendError(int messageId, String error) {
        try {
            JSONObject callback = new JSONObject();
            callback.put("type", "callback");
            callback.put("id", messageId);
            callback.put("error", error);

            executeJS("window.handleWebMessage(" + callback.toString() + ")");
            Log.d(TAG, "📤 Sent error [ID:" + messageId + "]: " + error);
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

            executeJS("window.handleNativeMessage(" + event.toString() + ")");
            Log.d(TAG, "📤 Sent event: " + eventName);
        } catch (JSONException e) {
            Log.e(TAG, "sendEvent error", e);
        }
    }

    /**
     * 在 UI 线程上执行 JavaScript
     */
    private void executeJS(String jsCode) {
        activity.runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(jsCode, null);
            }
        });
    }
}
```

---

## 🔌 第四步：实现 VPN 管理器

### 4.1 创建 VpnManager.java

这个类负责实际的 VPN 操作。

```java
package com.example.vpnapp;

import android.app.Activity;
import android.content.Context;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import org.json.JSONObject;
import org.json.JSONException;

import java.io.IOException;
import java.net.Socket;
import java.net.InetSocketAddress;

public class VpnManager {
    private static final String TAG = "VpnManager";
    private Context context;
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
                String host = config.optString("host");
                int port = config.optInt("port", 443);
                String sni = config.optString("sni", host);

                Log.d(TAG, "Connecting to: " + host + ":" + port);

                // TODO: 实现实际的 VPN 连接逻辑
                // 这里可以使用 tun2socks, shadowsocks-android 等开源库

                // 模拟连接成功（实际应根据协议实现）
                Thread.sleep(1000);
                isConnected = true;
                connectionStartTime = System.currentTimeMillis();

                Log.d(TAG, "✅ Connected to " + host);
                callback.onCallback(true, null);

            } catch (Throwable e) {
                Log.e(TAG, "Connect error", e);
                callback.onCallback(false, e.getMessage());
            }
        }).start();
    }

    /**
     * 断开 VPN 连接
     */
    public void disconnect(ConnectCallback callback) {
        new Thread(() -> {
            try {
                Log.d(TAG, "Disconnecting...");
                Thread.sleep(500);

                isConnected = false;
                Log.d(TAG, "✅ Disconnected");
                callback.onCallback(true, null);

            } catch (InterruptedException e) {
                callback.onCallback(false, e.getMessage());
            }
        }).start();
    }

    /**
     * 获取 VPN 状态
     */
    public void getStatus(StatusCallback callback) {
        long duration = isConnected ? 
            (System.currentTimeMillis() - connectionStartTime) / 1000 : 0;
        long[] traffic = {0, 0}; // {upload, download}
        callback.onCallback(isConnected, (int) duration, traffic);
    }

    /**
     * 测试延迟
     */
    public void testLatency(JSONObject config, LatencyCallback callback) {
        new Thread(() -> {
            try {
                String host = config.optString("host", "8.8.8.8");
                int port = config.optInt("port", 443);

                Socket socket = new Socket();
                long startTime = System.currentTimeMillis();

                socket.connect(new InetSocketAddress(host, port), 5000);
                long latency = System.currentTimeMillis() - startTime;
                socket.close();

                Log.d(TAG, "Latency to " + host + ": " + latency + "ms");
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
                // TODO: 实现实际的速度测试
                // 可以从某个服务器下载文件测试速度
                
                // 模拟测试（3秒）
                Thread.sleep(3000);
                
                double download = 20 + Math.random() * 80;  // 20-100 Mbps
                double upload = 5 + Math.random() * 40;      // 5-45 Mbps
                int latency = 20 + (int)(Math.random() * 60); // 20-80 ms

                Log.d(TAG, String.format(
                    "Speed test result: %.1f Mbps ↓, %.1f Mbps ↑, %dms",
                    download, upload, latency
                ));
                callback.onCallback(download, upload, latency, null);

            } catch (InterruptedException e) {
                callback.onCallback(0, 0, 0, e.getMessage());
            }
        }).start();
    }

    /**
     * 检查 VPN 权限
     */
    public boolean checkPermissions(Context context) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            int permission = context.checkSelfPermission(
                android.Manifest.permission.BIND_VPN_SERVICE
            );
            return permission == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    /**
     * 请求 VPN 权限
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

    // 回调接口
    public interface ConnectCallback {
        void onCallback(boolean success, String error);
    }

    public interface StatusCallback {
        void onCallback(boolean connected, int duration, long[] traffic);
    }

    public interface LatencyCallback {
        void onCallback(int latency, String error);
    }

    public interface SpeedTestCallback {
        void onCallback(double download, double upload, int latency, String error);
    }

    public interface PermissionCallback {
        void onCallback(boolean granted);
    }
}
```

---

## 📦 第五步：复制前端资源

### 5.1 打包前端应用

在前端项目目录执行：

```bash
cd d:\typer\android_demo\vpnapp
npm run build
```

### 5.2 创建 assets 目录

```bash
# 在 Android Studio 中创建目录
mkdir -p app/src/main/assets/dist
```

### 5.3 复制文件

```bash
# 将前端的 dist 目录复制到 Android 项目的 assets/dist 中
# Windows PowerShell
Copy-Item -Path "dist/*" -Destination "app/src/main/assets/dist" -Recurse -Force

# Linux/macOS
cp -r dist/* app/src/main/assets/dist/
```

---

## 🧪 第六步：编译和测试

### 6.1 在 Android Studio 中编译

```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### 6.2 运行应用

```
Run → Run 'app'
```

### 6.3 查看日志

打开 Android Studio 的 Logcat：

```
View → Tool Windows → Logcat

# 过滤 JSBridge 日志
Filter: JSBridge
```

### 6.4 测试 JSBridge 通信

在应用中点击"连接"按钮，应该在 Logcat 中看到类似的日志：

```
D/JSBridge: 📨 Received from JS: {"id":1,"method":"native.vpn.connect","params":{...}}
D/JSBridge: 🔄 Handling: native.vpn.connect
D/JSBridge: Connecting to: example.com:443
D/JSBridge: ✅ Connected to example.com
D/JSBridge: 📤 Sent callback [ID:1]
```

---

## 🐛 常见问题和解决方案

### 问题 1: JSBridge 未被注入

```
日志: JSBridge: 📨 Received from JS: ERR_UNDEFINED
```

**解决：**
1. 检查 `WebView.addJavascriptInterface()` 是否在正确的线程上调用
2. 确保 `"VpnJSBridge"` 拼写正确

### 问题 2: JavaScript 执行失败

```
错误: evaluateJavascript called on a background thread
```

**解决：**
在 `executeJS()` 中必须使用 `runOnUiThread()`

```java
activity.runOnUiThread(() -> {
    webView.evaluateJavascript(jsCode, null);
});
```

### 问题 3: WebView 加载本地文件出错

```
错误: Failed to load resource: file:///android_asset/...
```

**解决：**
确保文件路径正确：
```java
webView.loadUrl("file:///android_asset/dist/index.html");
//               ↑ 三斜杠
```

### 问题 4: 权限不足

```
错误: Permission denied
```

**解决：**
1. 在 AndroidManifest.xml 中声明权限
2. 对 Android 6.0+ (API 23+) 实现运行时权限请求

---

## 📝 开发检查清单

完成以下步骤后，你的 Android App 壳子就可以与前端应用通信了：

- [ ] 创建 Android 项目
- [ ] 配置 WebView 布局
- [ ] 实现 MainActivity
- [ ] 实现 JSBridgeInterface
- [ ] 实现 VpnManager
- [ ] 添加权限到 AndroidManifest.xml
- [ ] 打包前端应用 (npm run build)
- [ ] 复制前端资源到 assets/dist
- [ ] 在 Android Studio 中编译
- [ ] 在模拟器或真机上运行
- [ ] 检查 Logcat 日志
- [ ] 点击"连接"按钮测试 JSBridge 通信
- [ ] 确保能看到 "✅ Connected" 日志

---

## 🎯 后续开发任务

1. **实现真实 VPN 连接**
   - 集成 tun2socks 或其他 VPN 库
   - 根据协议（vless/vmess/trojan）实现连接逻辑

2. **实现真实速度测试**
   - 从服务器下载文件
   - 计算下载/上传速度

3. **优化性能**
   - 减少 JavaScript 调用
   - 缓存频繁调用的数据

4. **增强错误处理**
   - 添加更详细的错误信息
   - 实现重试机制

5. **生产打包**
   - 签名 APK
   - 上架到应用商店

---

**祝你开发顺利！** 🚀
