import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useVpnViewModel } from '../store/useVpnViewModel';
import ConnectButton from '../components/ConnectButton';

export default function HomeScreen({ navigation }) {
  const vm = useVpnViewModel();
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={{ flex: 1, paddingTop: 24, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 24 }}>Home</Text>
      <View style={{ backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>Current</Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 }}>
          {vm.selectedNode ? `${vm.selectedNode.flag} ${vm.selectedNode.name}` : 'No server'}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
          {vm.selectedNode ? `${vm.selectedNode.protocol.toUpperCase()} · ${vm.selectedNode.region}` : ''}
        </Text>
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <ConnectButton status={vm.status} onPress={vm.isConnected ? vm.disconnect : vm.connect} duration={vm.duration} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', opacity: vm.isConnected ? 1 : 0.5 }} />
          <Text style={{ color: '#10b981', fontSize: 12, marginLeft: 6, letterSpacing: 2 }}>LIVE</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Speed')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: '#3b82f6',
            }}
          >
            <Text style={{ color: '#60a5fa', textAlign: 'center', fontWeight: '700' }}>Speed Test</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Servers')}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 2, borderColor: '#334155' }}
          >
            <Text style={{ color: '#cbd5e1', textAlign: 'center', fontWeight: '700' }}>Servers</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Servers')}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e293b' }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Servers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Premium')}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1e293b' }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Premium</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
