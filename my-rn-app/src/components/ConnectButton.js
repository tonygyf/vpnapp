import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, Animated } from 'react-native';

export default function ConnectButton({ status, onPress, duration }) {
  const isConnected = status === 'CONNECTED';
  const isConnecting = status === 'CONNECTING' || status === 'DISCONNECTING';

  const outer = useRef(new Animated.Value(0)).current;
  const inner = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    outer.setValue(0);
    inner.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(outer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(outer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(inner, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(inner, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    spin.setValue(0);
    if (isConnecting) {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    }
  }, [isConnecting]);

  const outerScale = outer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const outerOpacity = outer.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] });
  const innerOpacity = inner.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.3] });
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const bgStart = isConnected ? '#10b981' : isConnecting ? '#f59e0b' : '#2563eb';
  const bgEnd = isConnected ? '#0f766e' : isConnecting ? '#ea580c' : '#1e40af';
  const borderColor = isConnected ? '#34d399' : isConnecting ? '#fbbf24' : '#60a5fa';

  const format = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 192,
          height: 192,
          borderRadius: 96,
          backgroundColor: isConnected ? '#10b981' : isConnecting ? '#f59e0b' : '#3b82f6',
          opacity: outerOpacity,
          transform: [{ scale: outerScale }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: isConnected ? '#10b981' : isConnecting ? '#f59e0b' : '#3b82f6',
          opacity: innerOpacity,
        }}
      />
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          disabled={isConnecting}
          onPressIn={() => Animated.spring(press, { toValue: 0.95, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true }).start()}
          style={{
            width: 160,
            height: 160,
            borderRadius: 80,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 4,
            borderColor,
            backgroundColor: bgStart,
          }}
        >
          {isConnecting ? (
            <Animated.View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 6,
                borderColor: borderColor,
                borderTopColor: 'transparent',
                transform: [{ rotate: spinDeg }],
              }}
            />
          ) : (
            <Text style={{ color: '#fff', fontSize: 48 }}>{isConnected ? '✓' : '⚡'}</Text>
          )}
          <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 2, marginTop: 6 }}>
            {isConnected ? 'STOP' : isConnecting ? 'WAIT' : 'START'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={{ marginTop: 24, height: 36 }}>
        {isConnected ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#10b981', fontWeight: '700', letterSpacing: 1 }}>VPN PROTECTED</Text>
            <Text style={{ color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{format(duration)}</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: isConnecting ? '#f59e0b' : '#cbd5e1', fontWeight: '700', letterSpacing: 1 }}>
              {status === 'DISCONNECTED' ? 'TAP TO CONNECT' : status.replace('_', ' ')}
            </Text>
            <Text style={{ color: '#64748b', marginTop: 2 }}>Secure & Fast</Text>
          </View>
        )}
      </View>
    </View>
  );
}
