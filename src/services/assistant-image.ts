import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { PhotoPermissionError } from './photo-errors';

export type AssistantImageSource = 'camera' | 'library';

export interface AssistantImage {
  uri: string;
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export async function pickAssistantImage(source: AssistantImageSource): Promise<AssistantImage | null> {
  if (source === 'camera') {
    if (Platform.OS === 'ios' && !Device.isDevice) {
      throw new Error('O Simulador iOS não possui câmera. Use um iPhone físico ou escolha uma foto.');
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new PhotoPermissionError('Ative a permissão de câmera nos Ajustes para fotografar o medicamento.');
    }
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new PhotoPermissionError('Ative o acesso às fotos nos Ajustes para escolher uma imagem.');
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: false,
    base64: true,
    quality: 0.5,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
  if (!asset.base64) throw new Error('Não foi possível preparar a imagem para análise.');
  const mimeType = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp'
    ? asset.mimeType
    : 'image/jpeg';
  return { uri: asset.uri, base64: asset.base64, mimeType };
}
