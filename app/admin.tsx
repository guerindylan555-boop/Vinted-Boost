import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';

type FileRow = { id: string; mime: string; size: number; created_at: number };

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'maintenant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return `il y a ${days} j`;
}

export default function Admin() {
  const [rows, setRows] = useState<FileRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminKeyInput, setAdminKeyInput] = useState<string>(process.env.EXPO_PUBLIC_ADMIN_KEY || '');

  const base = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  const api = base ? `${base}/api/files` : '/api/files';

  async function fetchList() {
    setLoading(true); setError(null);
    try {
      const url = adminKeyInput ? `${api}?limit=100&key=${encodeURIComponent(adminKeyInput)}` : `${api}?limit=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as FileRow[];
      setRows(json);
    } catch (e: any) {
      setError(e?.message || 'Échec chargement');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert('Supprimer', `Supprimer le fichier ${id} ?`, [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;
      const url = adminKeyInput ? `${api}/${encodeURIComponent(id)}?key=${encodeURIComponent(adminKeyInput)}` : `${api}/${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => (prev || []).filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Échec suppression');
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Admin — Fichiers</Text>
      <View style={{ height: 8 }} />
      <Text style={{ color: '#6b7280' }}>Lister et supprimer les fichiers stockés. Si un ADMIN_KEY est configuré côté API, renseignez-le ci-dessous.</Text>
      <View style={{ height: 12 }} />
      <TextInput
        placeholder="ADMIN_KEY (optionnel)"
        value={adminKeyInput}
        onChangeText={setAdminKeyInput}
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}
        autoCapitalize="none"
      />
      <View style={{ height: 8 }} />
      <TouchableOpacity onPress={fetchList} style={{ backgroundColor: '#0f172a', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, alignSelf: 'flex-start' }}>
        <Text style={{ color: 'white', fontWeight: '600' }}>Rafraîchir</Text>
      </TouchableOpacity>

      <View style={{ height: 16 }} />
      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color="#0f172a" />
          <Text style={{ marginLeft: 8, color: '#6b7280' }}>Chargement…</Text>
        </View>
      ) : null}
      {error ? <Text style={{ color: '#dc2626', marginTop: 8 }}>{error}</Text> : null}

      <View style={{ height: 8 }} />
      {rows && rows.length === 0 ? (
        <Text style={{ color: '#6b7280' }}>Aucun fichier.</Text>
      ) : null}
      {rows && rows.length ? (
        <View>
          {rows.map((r) => (
            <View key={r.id} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: '#111827' }}>{r.id}</Text>
              <Text style={{ color: '#6b7280' }}>{r.mime} · {fmtBytes(r.size)} · {timeAgo(r.created_at)}</Text>
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => remove(r.id)} style={{ backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

