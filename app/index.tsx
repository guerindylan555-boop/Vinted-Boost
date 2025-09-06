import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View, Text, Image, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { loadApiKey, saveApiKey } from '../lib/settings';
import { newRunId, setRun } from '../lib/runStore';
import { router } from 'expo-router';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Home() {
  const [inputPreviewUri, setInputPreviewUri] = useState<string | null>(null);
  const [inputDataUrl, setInputDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const canGenerate = useMemo(() => Boolean(inputDataUrl), [inputDataUrl]);

  useEffect(() => {
    (async () => {
      const k = await loadApiKey();
      if (k) setApiKey(k);
    })();
  }, []);

  async function pickImageNative() {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission refusée pour accéder aux photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 1, base64: false });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const mime = (asset.mimeType && asset.mimeType.startsWith('image/')) ? asset.mimeType : 'image/jpeg';
      const dataUrl = `data:${mime};base64,${base64}`;
      setInputPreviewUri(asset.uri);
      setInputDataUrl(dataUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de lecture du fichier.');
    }
  }

  function pickImageWeb(useCamera: boolean = false) {
    setError(null);
    const input = document.createElement('input');
    input.type = 'file';
    if (useCamera) (input as any).capture = 'environment';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          setInputDataUrl(result);
          const url = URL.createObjectURL(file);
          setInputPreviewUri(url);
        };
        reader.onerror = () => setError('Échec de lecture du fichier.');
        reader.readAsDataURL(file);
      } catch (e: any) {
        setError(e?.message ?? 'Échec de lecture du fichier.');
      } finally {
        input.remove();
      }
    };
    input.click();
  }

  async function onGenerate() {
    if (!inputDataUrl) return;
    // Crée un run et navigue vers l’écran de chargement
    const id = newRunId();
    setRun(id, { inputDataUrl, apiKey });
    router.push({ pathname: '/loading', params: { run: id } });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ alignItems: 'center', paddingTop: 24, paddingBottom: 48 }}>
      <View className="w-full max-w-md px-4" style={{ width: '100%', maxWidth: 480, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text className="text-2xl font-bold text-neutral-900 mt-2" style={{ fontSize: 24, fontWeight: '700', color: '#171717', marginTop: 8, flex: 1 }}>Ajouter un vêtement</Text>
          <TouchableOpacity onPress={() => { setTempKey(apiKey || ''); setSettingsOpen(true); }}>
            <Text style={{ color: '#0f172a', fontWeight: '600' }}>Réglages</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-neutral-600" style={{ color: '#525252' }}>Sélectionnez une photo non portée, puis appuyez sur Générer.</Text>

        {/* Boutons d’upload (en premier pour être visibles sans scroll) */}
        {Platform.OS === 'web' ? (
          <View>
            <TouchableOpacity onPress={() => pickImageWeb(false)} className="bg-neutral-900 rounded-xl py-3 px-4 items-center" style={{ backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}>
              <Text className="text-white font-semibold" style={{ color: 'white', fontWeight: '600' }}>Choisir depuis fichiers</Text>
            </TouchableOpacity>
            <View style={{ height: 12 }} />
            <TouchableOpacity onPress={() => pickImageWeb(true)} className="bg-neutral-800 rounded-xl py-3 px-4 items-center" style={{ backgroundColor: '#334155', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}>
              <Text className="text-white font-semibold" style={{ color: 'white', fontWeight: '600' }}>Prendre une photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={pickImageNative} className="bg-neutral-900 rounded-xl py-3 px-4 items-center" style={{ backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}>
            <Text className="text-white font-semibold" style={{ color: 'white', fontWeight: '600' }}>Choisir une image</Text>
          </TouchableOpacity>
        )}

        {/* Upload / Preview */}
        <View className="mt-2 rounded-xl border border-neutral-200 overflow-hidden" style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          {inputPreviewUri ? (
            <Image source={{ uri: inputPreviewUri }} style={{ width: '100%', aspectRatio: 4 / 5 }} resizeMode="cover" />
          ) : (
            <View style={{ width: '100%', aspectRatio: 4 / 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
              <Text className="text-neutral-500" style={{ color: '#737373' }}>Aucune image</Text>
            </View>
          )}
        </View>

        {/* Generate button */}
        <View style={{ height: 16 }} />
        <TouchableOpacity
          onPress={onGenerate}
          disabled={!canGenerate}
          className={cn('rounded-xl py-3 px-4 items-center', canGenerate ? 'bg-primary-900' : 'bg-neutral-200')}
          style={{ borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', backgroundColor: canGenerate ? '#0f172a' : '#e5e7eb' }}
        >
          <Text className={cn('font-semibold', canGenerate ? 'text-white' : 'text-neutral-500')} style={{ fontWeight: '600', color: canGenerate ? 'white' : '#737373' }}>Générer</Text>
        </TouchableOpacity>

        {/* Error */}
        {error ? <Text className="text-red-600" style={{ color: '#dc2626' }}>{error}</Text> : null}

        <View className="h-6" style={{ height: 24 }} />
        {/* Settings Modal */}
        <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ width: '100%', maxWidth: 520, backgroundColor: 'white', borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Clé API OpenRouter</Text>
              <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 8 }}>Collez votre clé commençant par sk-or-</Text>
              <TextInput
                value={tempKey}
                onChangeText={setTempKey}
                secureTextEntry
                placeholder="sk-or-..."
                autoCapitalize="none"
                autoCorrect={false}
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setSettingsOpen(false)}>
                  <Text style={{ color: '#6b7280', fontWeight: '600' }}>Annuler</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity
                  onPress={async () => {
                    const trimmed = tempKey.trim();
                    await saveApiKey(trimmed || null);
                    setApiKey(trimmed || null);
                    setSettingsOpen(false);
                  }}
                >
                  <Text style={{ color: '#0f172a', fontWeight: '700' }}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

