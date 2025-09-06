import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';

type Row = { id: string; created_at: string; input_url?: string | null; output_url?: string | null };

export default function History() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const baseEnv = (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL || '';
      const base = String(baseEnv);
      const endpoint = base ? base.replace(/\/$/, '') + '/api/history?limit=50' : '/api/history?limit=50';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Historique</Text>
        <TouchableOpacity onPress={load} style={{ backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Rafraîchir</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={{ color: '#dc2626', marginTop: 8 }}>{error}</Text> : null}
      <View style={{ height: 12 }} />
      {rows.map((r) => (
        <View key={r.id} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: '#374151', marginBottom: 8 }}>{new Date(r.created_at).toLocaleString()}</Text>
          <View style={{ flexDirection: 'row' }}>
            {r.input_url ? (
              <Image source={{ uri: r.input_url }} style={{ width: 100, height: 125, borderRadius: 8, backgroundColor: '#f3f4f6', marginRight: 12 }} />
            ) : null}
            {r.output_url ? (
              <Image source={{ uri: r.output_url }} style={{ width: 100, height: 125, borderRadius: 8, backgroundColor: '#f3f4f6' }} />
            ) : null}
          </View>
        </View>
      ))}
      {rows.length === 0 ? <Text style={{ color: '#6b7280' }}>Aucune entrée pour le moment.</Text> : null}
    </ScrollView>
  );
}

