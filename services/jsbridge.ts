/**
 * JSBridge 通信层
 * 提供前端与原生代码的双向通信机制
 * 支持 Android 和 iOS 平台
 * 
 * [已升级] 集成增强的 NativeBridge
 * - 自动探活
 * - 超时重试
 * - 自动恢复
 */

type MessageCallback = (response: any) => void;
type EventListener = (data: any) => void;

interface PendingMessage {
  callback?: MessageCallback;
  timeout: number;
}

class JSBridge {
  private static instance: JSBridge;
  private messageId: number = 0;
  private pendingMessages: Map<number, PendingMessage> = new Map();
  private eventListeners: Map<string, EventListener[]> = new Map();
  private isWebViewReady: boolean = false;
  private nativeBridge: any = null;

  private constructor() {
    this.initializeBridge();
  }

  static getInstance(): JSBridge {
    if (!JSBridge.instance) {
      JSBridge.instance = new JSBridge();
    }
    return JSBridge.instance;
  }

  /**
   * 初始化 JSBridge
   */
  private initializeBridge() {
    // 尝试获取增强的 NativeBridge
    if ((window as any).NativeBridge) {
      this.nativeBridge = (window as any).NativeBridge;
      console.log('JSBridge: Using enhanced NativeBridge');
      this.isWebViewReady = true;
      return;
    }

    // 检测是否在 WebView 中
    const isAndroid = /Android/.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    if (isAndroid || isIOS) {
      this.setupWebViewBridge();
    } else {
      console.warn('JSBridge: Not running in a WebView environment');
      this.isWebViewReady = false;
    }
  }

  /**
   * 设置 WebView 桥接
   */
  private setupWebViewBridge() {
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isAndroid) {
      if ((window as any).VpnJSBridge) {
        console.log('JSBridge: Android WebView detected');
        this.isWebViewReady = true;
        (window as any).handleWebMessage = this.handleNativeMessage.bind(this);
      } else {
        console.warn('JSBridge: Waiting for Android WebView bridge injection...');
        setTimeout(() => this.checkAndroidBridge(), 500);
      }
    } else {
      if ((window as any).webkit?.messageHandlers?.vpnBridge) {
        console.log('JSBridge: iOS WebView detected');
        this.isWebViewReady = true;
        (window as any).handleNativeMessage = this.handleNativeMessage.bind(this);
      } else {
        console.warn('JSBridge: Waiting for iOS WebView bridge injection...');
        setTimeout(() => this.checkIOSBridge(), 500);
      }
    }
  }

  private checkAndroidBridge() {
    if ((window as any).VpnJSBridge) {
      this.isWebViewReady = true;
      console.log('JSBridge: Android bridge ready');
      this.emit('bridge-ready', {});
    }
  }

  private checkIOSBridge() {
    if ((window as any).webkit?.messageHandlers?.vpnBridge) {
      this.isWebViewReady = true;
      console.log('JSBridge: iOS bridge ready');
      this.emit('bridge-ready', {});
    }
  }

  /**
   * 检查 JSBridge 是否就绪
   */
  isReady(): boolean {
    return this.isWebViewReady || !!this.nativeBridge;
  }

  /**
   * 调用原生方法
   * [新] 如果有 NativeBridge，优先使用增强版本
   */
  call(method: string, params?: Record<string, any>, callback?: MessageCallback): Promise<any> {
    // 优先使用增强的 NativeBridge
    if (this.nativeBridge && typeof this.nativeBridge.call === 'function') {
      console.log(`[JSBridge] Using NativeBridge for ${method}`);
      return this.nativeBridge.call(method, params || {}).then((result: any) => {
        if (callback) callback(result);
        return result;
      });
    }

    // 降级到原来的实现
    return new Promise((resolve, reject) => {
      if (!this.isWebViewReady) {
        console.warn('JSBridge: Bridge not ready, queuing message');
        setTimeout(() => {
          this.call(method, params, callback)
            .then(resolve)
            .catch(reject);
        }, 100);
        return;
      }

      const messageId = ++this.messageId;
      const message = {
        id: messageId,
        method,
        params: params || {},
      };

      const pendingMsg: PendingMessage = {
        callback: (response: any) => {
          if (callback) callback(response);
          resolve(response);
        },
        timeout: window.setTimeout(() => {
          this.pendingMessages.delete(messageId);
          reject(new Error(`JSBridge timeout: ${method}`));
        }, 30000),
      };

      this.pendingMessages.set(messageId, pendingMsg);
      this.sendToNative(message);
    });
  }

  /**
   * 发送消息到原生层
   */
  private sendToNative(message: Record<string, any>) {
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isAndroid) {
      // Android: 通过 VpnJSBridge 接口
      if ((window as any).VpnJSBridge?.postMessage) {
        (window as any).VpnJSBridge.postMessage(JSON.stringify(message));
      } else {
        console.error('JSBridge: Android VpnJSBridge not available');
      }
    } else {
      // iOS: 通过 webkit.messageHandlers
      if ((window as any).webkit?.messageHandlers?.vpnBridge?.postMessage) {
        (window as any).webkit.messageHandlers.vpnBridge.postMessage(message);
      } else {
        console.error('JSBridge: iOS bridge not available');
      }
    }
  }

  /**
   * 处理来自原生的消息（回调和事件）
   * 由原生代码调用
   */
  private handleNativeMessage(message: string | Record<string, any>) {
    try {
      // Android 发送的是 JSON 字符串，iOS 发送的是对象
      const msg = typeof message === 'string' ? JSON.parse(message) : message;

      if (msg.type === 'callback') {
        // 这是对之前调用的回复
        this.handleCallback(msg);
      } else if (msg.type === 'event') {
        // 这是从原生发来的事件
        this.handleEvent(msg);
      }
    } catch (error) {
      console.error('JSBridge: Failed to handle native message:', error, message);
    }
  }

  /**
   * 处理回调消息
   */
  private handleCallback(msg: Record<string, any>) {
    const { id, data, error } = msg;
    const pending = this.pendingMessages.get(id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(id);

      if (pending.callback) {
        pending.callback(error ? { success: false, error } : data);
      }
    }
  }

  /**
   * 处理事件消息
   */
  private handleEvent(msg: Record<string, any>) {
    const { name, data } = msg;
    this.emit(name, data);
  }

  /**
   * 监听原生事件
   */
  on(eventName: string, listener: EventListener): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }

    this.eventListeners.get(eventName)!.push(listener);

    // 返回取消注册函数
    return () => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 监听一次原生事件
   */
  once(eventName: string, listener: EventListener): () => void {
    const wrappedListener = (data: any) => {
      listener(data);
      unsubscribe();
    };

    const unsubscribe = this.on(eventName, wrappedListener);
    return unsubscribe;
  }

  /**
   * 触发事件（用于测试或内部通信）
   */
  private emit(eventName: string, data: any) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`JSBridge: Error in event listener for '${eventName}':`, error);
        }
      });
    }
  }

  /**
   * 获取平台信息
   */
  getPlatform(): 'android' | 'ios' | 'web' {
    const userAgent = navigator.userAgent;
    if (/Android/.test(userAgent)) return 'android';
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
    return 'web';
  }
}

// 导出单例
export const jsbridge = JSBridge.getInstance();

// 导出类型
export type { MessageCallback, EventListener };
