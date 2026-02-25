/**
 * JSBridge 适配层
 * 将原来的 jsbridge 调用转换为新的 NativeBridge 调用
 * 这样可以逐步迁移老代码，无需一次性重写所有调用
 */

import NativeBridge from './nativeBridge';

type MessageCallback = (response: any) => void;
type EventListener = (data: any) => void;

class JSBridgeAdapter {
  private eventListeners: Map<string, EventListener[]> = new Map();

  /**
   * 调用原生方法（兼容旧 API）
   */
  async call(method: string, params: any = {}): Promise<any> {
    console.log(`[JSBridgeAdapter] call: ${method}`, params);
    
    // 将 native.xxx.yyy 转换为对应的调用
    // 例如：native.vpn.connect → 直接调用 vpn.connect
    let actualMethod = method;
    if (method.startsWith('native.')) {
      actualMethod = method.substring(7); // 移除 'native.' 前缀
    }

    try {
      const result = await NativeBridge.call(actualMethod, params);
      return result;
    } catch (error) {
      console.error(`[JSBridgeAdapter] call failed: ${method}`, error);
      throw error;
    }
  }

  /**
   * 监听事件
   */
  on(eventName: string, callback: EventListener): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)!.push(callback);

    // 返回取消订阅函数
    return () => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 触发事件（内部使用）
   */
  emit(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[JSBridgeAdapter] Event handler error:`, error);
      }
    });
  }

  /**
   * 检查 Bridge 是否就绪
   */
  isReady(): boolean {
    const status = NativeBridge.getStatus();
    return status.isAlive;
  }
}

// 导出单例
export const jsbridgeAdapter = new JSBridgeAdapter();
export default jsbridgeAdapter;
