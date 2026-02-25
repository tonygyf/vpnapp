/**
 * ==================== 增强版 JSBridge 调用封装 ====================
 * 
 * 特性：
 * 1. 自动探活（ping 检查）👁️
 * 2. 超时重试机制（3次重试）🔄
 * 3. 自动刷新页面恢复 🔁
 * 4. 统一的错误处理 ⚠️
 * 
 * 使用方式: 见底部的使用示例
 */

interface PendingCallback {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface AndroidBridgeInterface {
  [method: string]: (callbackId: string, params: string) => void;
  ping?: (callbackId: string) => void;
  postMessage?: (message: string) => void;
}

class NativeBridgeManager {
  private callbacks: Map<string, PendingCallback> = new Map();
  private timeoutMs: number = 8000; // 原来30秒 → 改成8秒，更快重试
  private maxRetries: number = 2;
  private isAlive: boolean = false;
  private lastPingTime: number = 0;
  private pingInterval: number = 5000; // 5秒检查一次

  constructor() {
    this.initialize();
  }

  /**
   * 初始化 Bridge
   */
  private initialize(): void {
    // 检测环境
    if ((window as any).AndroidBridge) {
      this.isAlive = true;
      console.log('[NativeBridge] Android Bridge detected');
      this.startPingCheck();
    } else if ((window as any).webkit?.messageHandlers?.vpnBridge) {
      this.isAlive = true;
      console.log('[NativeBridge] iOS Bridge detected');
      this.startPingCheck();
    } else {
      console.warn('[NativeBridge] No native bridge detected - running in mock mode');
      this.startMockMode();
    }

    // 全局回调处理
    (window as any).handleNativeBridgeCallback = this.onCallback.bind(this);
  }

  /**
   * 启动定期ping检查
   */
  private startPingCheck(): void {
    setInterval(() => {
      this.ping().catch((err) => {
        console.warn('[NativeBridge] Ping failed:', err.message);
        this.isAlive = false;
      });
    }, this.pingInterval);
  }

  /**
   * Mock 模式（用于开发/测试）
   */
  private startMockMode(): void {
    console.log('[NativeBridge] Running in mock mode - no native calls will be executed');
    // 可以在这里注入 mock 数据或空响应
  }

  /**
   * 核心调用函数 - 所有 native.xxx 都改成调用这个
   */
  async call(method: string, params: Record<string, any> = {}): Promise<any> {
    console.log(`[NativeBridge.call] Invoking ${method}`, params);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // 1. 先 ping 检查桥是否活着
        const alive = await this.ping();
        if (!alive) {
          console.warn(`[NativeBridge] 第${attempt}次 ping 失败 → 自动刷新页面`);
          this.reloadPage();
          throw new Error('bridge_dead');
        }

        // 2. 执行真实调用
        const result = await this._rawCall(method, params);
        console.log(`[NativeBridge] ${method} 成功:`, result);
        return result;
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('timeout') && attempt < this.maxRetries) {
          console.warn(`[NativeBridge] 第${attempt}次超时，重试中... (${attempt + 1}/${this.maxRetries})`);
          // 重试间隔
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }

        // 最终失败
        if (attempt === this.maxRetries) {
          console.error(`[NativeBridge] ${method} 全部重试失败 → 强制刷新页面`);
          setTimeout(() => this.reloadPage(), 300);
        }
        throw error;
      }
    }

    throw new Error(`[NativeBridge] ${method} failed after all retries`);
  }

  /**
   * 内部真实调用（兼容两种调用方式）
   */
  private _rawCall(method: string, params: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const callbackId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 设置超时
      const timeout = setTimeout(() => {
        this.callbacks.delete(callbackId);
        reject(new Error(`JSBridge timeout: ${method} (${this.timeoutMs}ms)`));
      }, this.timeoutMs);

      // 存储回调
      this.callbacks.set(callbackId, {
        resolve,
        reject,
        timeout,
      });

      try {
        const androidBridge = (window as any).AndroidBridge as AndroidBridgeInterface | undefined;

        // 方式A：Android Bridge 直接方法调用
        if (androidBridge && typeof androidBridge[method] === 'function') {
          console.log(`[NativeBridge] Using Android method: ${method}`);
          androidBridge[method](callbackId, JSON.stringify(params));
        }
        // 方式B：通过 postMessage 方式
        else if (androidBridge?.postMessage) {
          console.log(`[NativeBridge] Using postMessage: ${method}`);
          androidBridge.postMessage(
            JSON.stringify({
              id: callbackId,
              method,
              params,
            })
          );
        }
        // iOS 方式
        else if ((window as any).webkit?.messageHandlers?.vpnBridge?.postMessage) {
          console.log(`[NativeBridge] Using iOS messageHandler: ${method}`);
          (window as any).webkit.messageHandlers.vpnBridge.postMessage({
            id: callbackId,
            method,
            params,
          });
        } else {
          throw new Error('AndroidBridge not found');
        }
      } catch (error) {
        clearTimeout(timeout);
        this.callbacks.delete(callbackId);
        reject(error as Error);
      }
    });
  }

  /**
   * Ping 探活
   */
  private async ping(): Promise<boolean> {
    // 缓存：5秒内不重复 ping
    const now = Date.now();
    if (now - this.lastPingTime < this.pingInterval) {
      return this.isAlive;
    }

    return new Promise((resolve) => {
      const callbackId = `ping_${Date.now()}`;
      const timer = setTimeout(() => {
        resolve(false);
      }, 1500);

      this.callbacks.set(callbackId, {
        resolve: () => {
          clearTimeout(timer);
          this.lastPingTime = Date.now();
          this.isAlive = true;
          resolve(true);
        },
        reject: () => resolve(false),
        timeout: timer,
      });

      try {
        const androidBridge = (window as any).AndroidBridge as AndroidBridgeInterface | undefined;

        if (androidBridge?.ping) {
          androidBridge.ping(callbackId);
        } else if ((window as any).webkit?.messageHandlers?.vpnBridge?.postMessage) {
          (window as any).webkit.messageHandlers.vpnBridge.postMessage({
            id: callbackId,
            method: 'ping',
            params: {},
          });
        } else {
          // 如果 native 还没加 ping，先假装成功
          this.isAlive = true;
          clearTimeout(timer);
          resolve(true);
        }
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  /**
   * 接收回调（原来的 handleNativeMessage 改成这样）
   */
  private onCallback(callbackId: string, result: any): void {
    const pending = this.callbacks.get(callbackId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.callbacks.delete(callbackId);
      pending.resolve(result);
    } else {
      console.warn(`[NativeBridge] 收到未知回调 callbackId=${callbackId}`);
    }
  }

  /**
   * 处理错误回调
   */
  private onError(callbackId: string, error: string): void {
    const pending = this.callbacks.get(callbackId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.callbacks.delete(callbackId);
      pending.reject(new Error(error));
    }
  }

  /**
   * 强制刷新页面
   */
  private reloadPage(): void {
    console.error('[NativeBridge] Reloading page...');
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  /**
   * 获取 Bridge 状态
   */
  getStatus(): { isAlive: boolean; lastPingTime: string } {
    return {
      isAlive: this.isAlive,
      lastPingTime: new Date(this.lastPingTime).toISOString(),
    };
  }
}

// ==================== 导出实例 ====================

/**
 * 主要导出对象 - 替换原来的 window.native 或 window.JSBridge
 */
const NativeBridge = new NativeBridgeManager();

// 全局挂载
(window as any).NativeBridge = NativeBridge;
(window as any).JSBridge = NativeBridge; // 兼容原来的名字

// 导出 TypeScript
export default NativeBridge;

// ==================== 使用示例 ====================
/**
 * 原来的调用方式：
 *   native.checkVpnPermissions({}).then(...)
 *   native.requestVpnPermissions({}).then(...)
 *
 * 改成：
 *   NativeBridge.call('checkVpnPermissions', {})
 *     .then(result => {
 *       console.log('权限检查结果', result);
 *     })
 *     .catch(err => {
 *       console.error(err);
 *       // 这里其实不用写，封装里已经自动 reload 了
 *     });
 *
 * 同样的方式改写：
 *   NativeBridge.call('requestVpnPermissions', {})
 *   NativeBridge.call('vpn.connect', { nodeId: '123' })
 *   NativeBridge.call('vpn.disconnect', {})
 *   NativeBridge.call('permission.check', {})
 */
