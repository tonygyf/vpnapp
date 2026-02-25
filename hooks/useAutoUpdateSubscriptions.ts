import { useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/subscriptionService';

/**
 * 订阅自动更新 Hook
 * 支持每天自动更新，用户也可以手动触发更新
 */

const AUTO_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24小时
const STORAGE_KEY_LAST_UPDATE = 'vpn_app_last_auto_update';

export const useAutoUpdateSubscriptions = (onUpdate?: () => void) => {
  /**
   * 检查并执行自动更新
   */
  const checkAndAutoUpdate = useCallback(async () => {
    const lastUpdate = localStorage.getItem(STORAGE_KEY_LAST_UPDATE);
    const lastUpdateTime = lastUpdate ? parseInt(lastUpdate) : 0;
    const now = Date.now();

    // 如果距离上次更新超过24小时，则执行更新
    if (now - lastUpdateTime >= AUTO_UPDATE_INTERVAL) {
      console.log('Auto-updating subscriptions...');
      try {
        await updateAllSubscriptions();
        localStorage.setItem(STORAGE_KEY_LAST_UPDATE, now.toString());
        console.log('Auto-update completed');
        onUpdate?.();
      } catch (error) {
        console.error('Auto-update failed:', error);
      }
    }
  }, [onUpdate]);

  /**
   * 手动更新所有订阅
   */
  const updateAllSubscriptions = useCallback(async () => {
    const subscriptions = subscriptionService.getSubscriptions();
    
    for (const sub of subscriptions) {
      try {
        await subscriptionService.fetchAndParseSubscription(sub.url, true);
      } catch (error) {
        console.error(`Failed to update ${sub.name || sub.url}:`, error);
      }
    }
  }, []);

  /**
   * App 启动时检查更新
   */
  useEffect(() => {
    checkAndAutoUpdate();
  }, [checkAndAutoUpdate]);

  return {
    updateAllSubscriptions,
    checkAndAutoUpdate,
  };
};

/**
 * 计算距离下次自动更新的时间（毫秒）
 */
export function getTimeUntilNextUpdate(): number {
  const lastUpdate = localStorage.getItem(STORAGE_KEY_LAST_UPDATE);
  const lastUpdateTime = lastUpdate ? parseInt(lastUpdate) : 0;
  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  
  if (timeSinceLastUpdate >= AUTO_UPDATE_INTERVAL) {
    return 0; // 可以立即更新
  }

  return AUTO_UPDATE_INTERVAL - timeSinceLastUpdate;
}

/**
 * 格式化剩余时间
 */
export function formatTimeUntilUpdate(): string {
  const ms = getTimeUntilNextUpdate();
  if (ms === 0) return 'Ready to update';

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `Update in ${hours}h ${minutes}m`;
  }
  return `Update in ${minutes}m`;
}
