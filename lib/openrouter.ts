export type GenerateParams = {
  imageDataUrl?: string | null; // data:image/png;base64,... ou https:// (optionnel)
  imageDataUrls?: string[]; // plusieurs images en entrée (optionnel)
  pose?: 'face' | 'three_quarter' | 'zoom';
  context?: 'studio' | 'bedroom';
  stream?: boolean; // optionnel: activer le streaming SSE
  onImageDelta?: (dataUrl: string) => void; // callback image (streaming)
  apiKey?: string | null; // optionnel: surcharger la clé via l'UI
};

export type GenerateResult = {
  imageDataUrl: string; // Returned data URL from model
  raw?: any;
};

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash-image-preview';

export async function generateTryOnImage({ imageDataUrl, imageDataUrls, pose = 'face', context = 'studio', stream = false, onImageDelta, apiKey: apiKeyOverride }: GenerateParams): Promise<GenerateResult> {
  const apiKey = apiKeyOverride || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_OPENROUTER_API_KEY manquant. Définissez la clé API OpenRouter.');
  }

  const prompt = [
    'Tu es un service assistant pour Vinted.',
    "Génère une image du vêtement porté (ou compose à partir des images fournies).",
    "Contraintes: respect strict des couleurs/motifs, pas de déformation du tissu.",
    "Composition: format portrait 4:5, éclairage uniforme, fond neutre.",
    `Pose: ${pose === 'face' ? 'face' : pose === 'three_quarter' ? 'trois-quarts' : 'zoom détaillé'}.`,
    `Contexte: ${context === 'studio' ? 'Studio' : 'Chambre'}.`,
    "Rends une seule image de haute qualité, sans texte ni watermark. Label interne: Image assistée par IA.",
  ].join(' ');

  const contentParts: any[] = [
    { type: 'text', text: prompt },
  ];

  const imgs: string[] = Array.isArray(imageDataUrls) && imageDataUrls.length
    ? imageDataUrls
    : (imageDataUrl ? [imageDataUrl] : []);

  for (const url of imgs) {
    if (typeof url === 'string' && url.length > 0) {
      contentParts.push({ type: 'image_url', image_url: { url } });
    }
  }

  const body: any = {
    model: MODEL,
    modalities: ['image', 'text'],
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
  };

  if (stream) body.stream = true;

  if (stream) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenRouter stream error ${res.status}: ${text}`);
    }

    const reader = (res.body as any).getReader?.();
    if (!reader) {
      throw new Error('Streaming non supporté dans cet environnement.');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let lastUrl: string | undefined;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const lines = event.split('\n').map((l) => l.trim()).filter(Boolean);
        const dataLines = lines.filter((l) => l.startsWith('data:'));
        for (const dl of dataLines) {
          const payload = dl.replace(/^data:\s?/, '');
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            const deltaUrl = obj?.choices?.[0]?.delta?.images?.[0]?.image_url?.url;
            if (typeof deltaUrl === 'string' && deltaUrl.startsWith('data:image')) {
              lastUrl = deltaUrl;
              onImageDelta?.(deltaUrl);
            }
            // Non-stream fallback: sometimes a full message can appear in stream
            const msgUrl = obj?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (typeof msgUrl === 'string' && msgUrl.startsWith('data:image')) {
              lastUrl = msgUrl;
              onImageDelta?.(msgUrl);
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    }

    if (!lastUrl) {
      throw new Error('Stream terminé sans image.');
    }
    return { imageDataUrl: lastUrl };
  } else {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Optionnels pour classer votre app:
        // 'HTTP-Referer': 'https://yourdomain.com',
        // 'X-Title': 'Vinted Assistant',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const json = await res.json();
    // Try to read non-streaming image response
    let url: string | undefined;
    try {
      url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    } catch {}

    if (!url) {
      // Fallback: some models may return an image as a text content (data URL)
      const maybeText = json?.choices?.[0]?.message?.content;
      if (typeof maybeText === 'string' && maybeText.startsWith('data:image')) {
        url = maybeText;
      }
    }

    if (!url) {
      throw new Error('Réponse sans image. Détails: ' + JSON.stringify(json));
    }

    return { imageDataUrl: url, raw: json };
  }
}
