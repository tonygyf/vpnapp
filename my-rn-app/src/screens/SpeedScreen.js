import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useVpnViewModel } from '../store/useVpnViewModel';

export default function SpeedScreen() {
  const vm = useVpnViewModel();
  const [testing, setTesting] = useState(false);
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const bar1 = useRef(new Animated.Value(0)).current;
  const bar2 = useRef(new Animated.Value(0)).current;
  const bar3 = useRef(new Animated.Value(0)).current;
  const loops = useRef([]);
  const gauge = useRef(new Animated.Value(-90)).current;

  useEffect(() => {
    loops.current.forEach((l) => l.stop && l.stop());
    loops.current = [];
    bar1.setValue(0);
    bar2.setValue(0);
    bar3.setValue(0);
    if (vm.status === 'CONNECTED' || vm.status === 'CONNECTING') {
      const mkLoop = (val, delay) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 600, useNativeDriver: true }),
          ])
        );
      const l1 = mkLoop(bar1, 0);
      const l2 = mkLoop(bar2, 150);
      const l3 = mkLoop(bar3, 300);
      loops.current = [l1, l2, l3];
      l1.start();
      l2.start();
      l3.start();
    }
    return () => {
      loops.current.forEach((l) => l.stop && l.stop());
    };
  }, [vm.status]);

  useEffect(() => {
    const target = Math.min(vm.speedStats.download || 0, 100) * 1.8 - 90;
    Animated.timing(gauge, { toValue: target, duration: 800, useNativeDriver: true }).start();
  }, [vm.speedStats.download]);

  const handleTest = async () => {
    if (!vm.isConnected) return;
    setTesting(true);
    await vm.runSpeedTest();
    setTesting(false);
  };

  return (
    <View style={{ flex: 1, paddingTop: 24, paddingHorizontal: 24, backgroundColor: '#0f172a' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 24 }}>Speed Test</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          <Animated.View
            style={{
              width: 6,
              height: 10,
              borderRadius: 2,
              backgroundColor: vm.isConnected ? '#10b981' : vm.status === 'CONNECTING' ? '#eab308' : '#ef4444',
              opacity: bar1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
              transform: [{ scaleY: bar1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            }}
          />
          <Animated.View
            style={{
              width: 6,
              height: 14,
              borderRadius: 2,
              backgroundColor: vm.isConnected ? '#10b981' : vm.status === 'CONNECTING' ? '#eab308' : '#ef4444',
              opacity: bar2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
              transform: [{ scaleY: bar2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            }}
          />
          <Animated.View
            style={{
              width: 6,
              height: 18,
              borderRadius: 2,
              backgroundColor: vm.isConnected ? '#10b981' : vm.status === 'CONNECTING' ? '#eab308' : '#ef4444',
              opacity: bar3.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
              transform: [{ scaleY: bar3.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            }}
          />
        </View>
        <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>
          {vm.isConnected ? formatDuration(vm.duration) : '00:00:00'}
        </Text>
      </View>

      <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
        <View style={{ width: 256, height: 128, overflow: 'hidden', marginBottom: 8 }}>
          <View
            style={{
              width: 256,
              height: 256,
              borderRadius: 128,
              borderWidth: 12,
              borderColor: '#1f2937',
            }}
          />
        </View>
        <View style={{ position: 'absolute', top: 84, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800' }}>
            {(vm.speedStats.download || 0).toFixed ? vm.speedStats.download.toFixed(1) : vm.speedStats.download ?? 0}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Mbps</Text>
          <Text style={{ color: '#60a5fa', fontSize: 12, marginTop: 2 }}>DOWNLOAD</Text>
        </View>
        <View style={{ position: 'absolute', top: 24, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ width: 256, height: 128, overflow: 'hidden' }}>
            <Animated.View
              style={{
                width: 256,
                height: 256,
                borderRadius: 128,
                borderWidth: 12,
                borderColor: 'transparent',
                borderTopColor: '#3b82f6',
                borderRightColor: '#3b82f6',
                transform: [{ rotate: gauge.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }],
              }}
            />
          </View>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>Current</Text>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 }}>
          {vm.selectedNode ? `${vm.selectedNode.flag} ${vm.selectedNode.name}` : '--'}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
          {vm.selectedNode ? `${vm.selectedNode.protocol.toUpperCase()} · ${vm.selectedNode.region}` : ''}
        </Text>

        <View style={{ marginTop: 32 }}>
          {!testing ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTest}
              disabled={!vm.isConnected}
              style={{
                paddingHorizontal: 48,
                paddingVertical: 12,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: vm.isConnected ? '#3b82f6' : '#1f2937',
                backgroundColor: 'transparent',
              }}
            >
              <Text
                style={{
                  color: vm.isConnected ? '#60a5fa' : '#6b7280',
                  fontSize: 16,
                  fontWeight: '700',
                  letterSpacing: 2,
                }}
              >
                {vm.isConnected ? 'GO' : 'CONNECT FIRST'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator color="#3b82f6" />
              <Text style={{ color: '#60a5fa', fontSize: 12, marginTop: 8, letterSpacing: 2 }}>TESTING...</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(30,41,59,0.8)',
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <Text style={{ color: '#34d399', marginBottom: 4 }}>↓</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
            {vm.speedStats.download ?? '--'}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Download</Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(30,41,59,0.8)',
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <Text style={{ color: '#6366f1', marginBottom: 4 }}>↑</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
            {vm.speedStats.upload ?? '--'}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Upload</Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(30,41,59,0.8)',
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <Text style={{ color: '#f59e0b', marginBottom: 4 }}>⟲</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: 'monospace' }}>
            {vm.speedStats.latency ?? '--'}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Ping</Text>
        </View>
      </View>
    </View>
  );
}
