import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useVpnViewModel } from '../store/useVpnViewModel';

export default function PremiumScreen() {
  const vm = useVpnViewModel();
  const [processing, setProcessing] = useState(false);

  const pay = async (method) => {
    setProcessing(true);
    await vm.purchasePremium(method);
    setProcessing(false);
  };

  return (
    <View style={{ flex: 1, paddingTop: 24, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 24 }}>Premium</Text>
      <View style={{ backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
        <Text style={{ color: '#94a3b8' }}>Status</Text>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 4 }}>{vm.isPremium ? 'Premium Activated' : 'Free Plan'}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={processing}
            onPress={() => pay('wechat')}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#16a34a' }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{processing ? 'Processing...' : 'WeChat Pay'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={processing}
            onPress={() => pay('alipay')}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2563eb' }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{processing ? 'Processing...' : 'Alipay'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
