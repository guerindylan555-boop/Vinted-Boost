import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getRun, updateRun } from '../lib/runStore';
import { generateTryOnImage } from '../lib/openrouter';

export default function LoadingScreen() {
  const { run } = useLocalSearchParams<{ run?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!run) {
        setError('Aucun identifiant de génération.');
        return;
      }
      const data = getRun(run);
      if (!data?.inputDataUrl) {
        setError('Données d’entrée introuvables.');
        return;
      }
      try {
        const res = await generateTryOnImage({ imageDataUrl: data.inputDataUrl, apiKey: data.apiKey || undefined });
        updateRun(run, { resultDataUrl: res.imageDataUrl, error: null });
        router.replace({ pathname: '/result', params: { run } });
      } catch (e: any) {
        const msg = e?.message ?? 'Échec de génération.';
        setError(msg);
        updateRun(run, { error: msg });
      }
    })();
  }, [run]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', paddingHorizontal: 16 }}>
      <ActivityIndicator size="large" color="#0f172a" />
      <Text style={{ marginTop: 16, fontWeight: '700', color: '#111827', fontSize: 16 }}>Génération en cours…</Text>
      <Text style={{ marginTop: 8, color: '#6b7280', textAlign: 'center' }}>Cela peut prendre 20–60 secondes.</Text>
      {error ? (
        <Text style={{ marginTop: 12, color: '#dc2626', textAlign: 'center' }}>{error}</Text>
      ) : null}
    </View>
  );
}

