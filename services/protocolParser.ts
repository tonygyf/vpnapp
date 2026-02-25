import { VpnNode } from '../types';

/**
 * 协议解析器
 * 支持 vless, vmess, trojan, shadowsocks 等协议
 */

// vless://用户ID@host:port?encryption=none&security=tls&sni=example.com#节点名称
function extractPingFromName(name: string): number | null {
  try {
    const seg = name.split('|').pop() || name;
    const match = seg.match(/(\d{1,4})\s*ms$/i);
    if (match) return parseInt(match[1], 10);
  } catch {}
  return null;
}

export function parseVlessLink(link: string): VpnNode | null {
  try {
    const url = new URL(link);
    const userInfo = url.username; // 用户ID
    const host = url.hostname;
    const port = parseInt(url.port) || 443;
    const nodeName = decodeURIComponent(url.hash.slice(1)) || `${host}:${port}`;
    
    // 从 query 参数获取加密、安全等信息
    const encryption = url.searchParams.get('encryption') || 'none';
    const security = url.searchParams.get('security') || 'none';
    const sni = url.searchParams.get('sni') || host;

    const parsedLatency = extractPingFromName(nodeName);
    const estimatedLatency = parsedLatency ?? (Math.floor(Math.random() * 100) + 20);

    return {
      id: `vless_${userInfo}_${host}`,
      name: nodeName,
      protocol: 'vless',
      region: extractRegionFromName(nodeName),
      flag: getCountryFlag(extractRegionFromName(nodeName)),
      ping: estimatedLatency,
      isPremium: false,
      // 额外信息存储
      _raw: {
        userInfo,
        host,
        port,
        encryption,
        security,
        sni,
      }
    };
  } catch (e) {
    console.error('Failed to parse vless link:', e);
    return null;
  }
}

// vmess://base64encoded
export function parseVmessLink(link: string): VpnNode | null {
  try {
    const vmessData = link.replace('vmess://', '');
    const decoded = atob(vmessData);
    const config = JSON.parse(decoded);

    // vmess 配置结构: { v, ps, add, port, id, aid, net, type, host, path, tls, sni }
    const nodeName = config.ps || `${config.add}:${config.port}`;
    const parsedLatency = extractPingFromName(nodeName);
    const estimatedLatency = parsedLatency ?? (Math.floor(Math.random() * 100) + 20);

    return {
      id: `vmess_${config.id}_${config.add}`,
      name: nodeName,
      protocol: 'vmess',
      region: extractRegionFromName(nodeName),
      flag: getCountryFlag(extractRegionFromName(nodeName)),
      ping: estimatedLatency,
      isPremium: false,
      _raw: config
    };
  } catch (e) {
    console.error('Failed to parse vmess link:', e);
    return null;
  }
}

// trojan://password@host:port?sni=example.com#节点名称
export function parseTrojanLink(link: string): VpnNode | null {
  try {
    const url = new URL(link);
    const password = url.username;
    const host = url.hostname;
    const port = parseInt(url.port) || 443;
    const sni = url.searchParams.get('sni') || host;
    const nodeName = decodeURIComponent(url.hash.slice(1)) || `${host}:${port}`;

    const parsedLatency = extractPingFromName(nodeName);
    const estimatedLatency = parsedLatency ?? (Math.floor(Math.random() * 100) + 20);

    return {
      id: `trojan_${password}_${host}`,
      name: nodeName,
      protocol: 'trojan',
      region: extractRegionFromName(nodeName),
      flag: getCountryFlag(extractRegionFromName(nodeName)),
      ping: estimatedLatency,
      isPremium: false,
      _raw: {
        password,
        host,
        port,
        sni,
      }
    };
  } catch (e) {
    console.error('Failed to parse trojan link:', e);
    return null;
  }
}

// ss://密码@host:port#节点名称 或 ss://base64encoded
export function parseShadowsocksLink(link: string): VpnNode | null {
  try {
    const url = new URL(link);
    const host = url.hostname;
    const port = parseInt(url.port) || 8388;
    const nodeName = decodeURIComponent(url.hash.slice(1)) || `${host}:${port}`;

    const parsedLatency = extractPingFromName(nodeName);
    const estimatedLatency = parsedLatency ?? (Math.floor(Math.random() * 100) + 20);

    return {
      id: `ss_${host}_${port}`,
      name: nodeName,
      protocol: 'vmess', // SS 先作为 vmess 处理，便于兼容
      region: extractRegionFromName(nodeName),
      flag: getCountryFlag(extractRegionFromName(nodeName)),
      ping: estimatedLatency,
      isPremium: false,
      _raw: {
        host,
        port,
      }
    };
  } catch (e) {
    console.error('Failed to parse shadowsocks link:', e);
    return null;
  }
}

/**
 * 通用链接解析器
 * 自动识别协议类型并调用相应的解析函数
 */
export function parseSubscriptionLink(link: string): VpnNode | null {
  const trimmedLink = link.trim();

  if (trimmedLink.startsWith('vless://')) {
    return parseVlessLink(trimmedLink);
  } else if (trimmedLink.startsWith('vmess://')) {
    return parseVmessLink(trimmedLink);
  } else if (trimmedLink.startsWith('trojan://')) {
    return parseTrojanLink(trimmedLink);
  } else if (trimmedLink.startsWith('ss://')) {
    return parseShadowsocksLink(trimmedLink);
  } else {
    console.warn('Unknown protocol in link:', trimmedLink);
    return null;
  }
}

/**
 * 从节点名称中提取地区信息
 * 例如："🇯🇵 Tokyo", "日本-东京" -> "JP" 或 "Tokyo"
 */
function extractRegionFromName(name: string): string {
  // 尝试提取旗帜后的文本
  const flagRegex = /🇴🇴|[\p{Emoji}]/gu;
  const withoutFlag = name.replace(flagRegex, '').trim();
  
  // 尝试提取第一个单词或中文
  const parts = withoutFlag.split(/[-\s,]/)[0];
  return parts || 'Unknown';
}

/**
 * 根据地区代码获取国旗emoji
 */
function getCountryFlag(region: string): string {
  const flagMap: Record<string, string> = {
    'JP': '🇯🇵', 'Japan': '🇯🇵', '日本': '🇯🇵',
    'US': '🇺🇸', 'USA': '🇺🇸', '美国': '🇺🇸',
    'SG': '🇸🇬', 'Singapore': '🇸🇬', '新加坡': '🇸🇬',
    'HK': '🇭🇰', 'Hong Kong': '🇭🇰', '香港': '🇭🇰',
    'TW': '🇹🇼', 'Taiwan': '🇹🇼', '台湾': '🇹🇼',
    'KR': '🇰🇷', 'Korea': '🇰🇷', '韩国': '🇰🇷',
    'GB': '🇬🇧', 'UK': '🇬🇧', '英国': '🇬🇧',
    'DE': '🇩🇪', 'Germany': '🇩🇪', '德国': '🇩🇪',
    'CA': '🇨🇦', 'Canada': '🇨🇦', '加拿大': '🇨🇦',
    'AU': '🇦🇺', 'Australia': '🇦🇺', '澳大利亚': '🇦🇺',
    'IN': '🇮🇳', 'India': '🇮🇳', '印度': '🇮🇳',
    'BR': '🇧🇷', 'Brazil': '🇧🇷', '巴西': '🇧🇷',
  };

  const upperRegion = region.toUpperCase();
  
  for (const [key, flag] of Object.entries(flagMap)) {
    if (region.includes(key) || upperRegion.includes(key)) {
      return flag;
    }
  }

  return '🌐'; // 默认国际旗帜
}
