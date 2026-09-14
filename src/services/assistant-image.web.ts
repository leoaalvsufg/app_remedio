import * as ImagePicker from 'expo-image-picker';

export type AssistantImageSource = 'camera' | 'library';

export interface AssistantImage {
  uri: string;
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export async function pickAssistantImage(source: AssistantImageSource): Promise<AssistantImage | null> {
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
  if (!asset.base64) throw new Error('Não foi possível preparar a imagem para análise.');
  const mimeType = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp'
    ? asset.mimeType
    : 'image/jpeg';
  return { uri: asset.uri, base64: asset.base64, mimeType };
}
