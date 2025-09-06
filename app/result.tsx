import React from 'react';
import { View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getRun } from '../lib/runStore';

export default function ResultScreen() {
  const { run } = useLocalSearchParams<{ run?: string }>();
  const data = run ? getRun(run) : undefined;
  const url = data?.resultDataUrl;
  const err = data?.error;

  return (
    <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 480, paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 24 : 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#171717', flex: 1 }}>Résultat</Text>
          <TouchableOpacity onPress={() => router.replace('/') }>
            <Text style={{ color: '#0f172a', fontWeight: '600' }}>Accueil</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#525252', marginTop: 4 }}>Image “portée” générée (4:5)</Text>

        {err ? (
          <Text style={{ color: '#dc2626', marginTop: 12 }}>{err}</Text>
        ) : null}

        {url ? (
          <View style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Image source={{ uri: url }} style={{ width: '100%', aspectRatio: 4/5 }} resizeMode="cover" />
          </View>
        ) : (
          <Text style={{ color: '#6b7280', marginTop: 12 }}>Aucune image à afficher.</Text>
        )}

        <View style={{ height: 16 }} />
        <TouchableOpacity onPress={() => router.replace('/')} style={{ backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Recommencer</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </View>
    </View>
  );
}

