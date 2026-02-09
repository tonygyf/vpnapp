import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Animated } from 'react-native';
import { useVpnViewModel } from '../store/useVpnViewModel';

export default function ServersScreen() {
  const vm = useVpnViewModel();
  const [showSubInput, setShowSubInput] = useState(false);
  const [subUrl, setSubUrl] = useState('');
  const slide = useRef(new Animated.Value(-20)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSubInput) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(-20);
      fade.setValue(0);
    }
  }, [showSubInput]);

  const handleImport = async () => {
    if (!subUrl) return;
    const ok = await vm.importSubscription(subUrl);
    if (ok) {
      setShowSubInput(false);
      setSubUrl('');
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: 24, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 }}>Servers</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowSubInput((v) => !v)}
          style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#3b82f6' }}
        >
          <Text style={{ color: '#60a5fa', fontWeight: '700' }}>{showSubInput ? 'Close' : '+ Add Sub'}</Text>
        </TouchableOpacity>
      </View>
      {showSubInput && (
        <Animated.View
          style={{
            transform: [{ translateY: slide }],
            opacity: fade,
            backgroundColor: '#1f2937',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: '#334155',
            marginBottom: 12,
          }}
        >
          <TextInput
            placeholder="Paste subscription URL"
            placeholderTextColor="#64748b"
            value={subUrl}
            onChangeText={setSubUrl}
            style={{
              color: '#fff',
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#334155',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 8,
            }}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleImport}
            style={{ paddingVertical: 10, borderRadius: 8, backgroundColor: '#2563eb' }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Import Nodes</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      <FlatList
        data={vm.nodes}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => vm.selectNode(item)}
            disabled={vm.isConnected}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(30,41,59,0.8)',
              borderWidth: 1,
              borderColor: vm.selectedNode?.id === item.id ? '#3b82f6' : '#334155',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {item.flag} {item.name}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  {item.protocol.toUpperCase()} · {item.region}
                </Text>
              </View>
              <View>
                <Text style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{item.ping} ms</Text>
                {item.isPremium ? <Text style={{ color: '#a855f7', fontSize: 10, textAlign: 'right' }}>Premium</Text> : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
