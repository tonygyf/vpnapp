const MOCK_NODES = [
  { id: '1', name: 'Tokyo-1', protocol: 'vmess', region: 'JP', flag: '🇯🇵', ping: 45, isPremium: false },
  { id: '2', name: 'Seoul-1', protocol: 'vless', region: 'KR', flag: '🇰🇷', ping: 60, isPremium: false },
  { id: '3', name: 'Singapore-1', protocol: 'trojan', region: 'SG', flag: '🇸🇬', ping: 30, isPremium: true },
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const mockVpnService = {
  async fetchSubscription(url) {
    await delay(200);
    return MOCK_NODES;
  },
  async connect(node) {
    await delay(500);
    return true;
  },
  async disconnect() {
    await delay(200);
    return true;
  },
  async performSpeedTest() {
    await delay(1200);
    const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
    return {
      download: rand(50, 150),
      upload: rand(20, 80),
      latency: rand(20, 80),
    };
  },
};
