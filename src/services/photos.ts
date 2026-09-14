import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { createId } from '@/utils/id';
import { PhotoPermissionError } from './photo-errors';

export type PhotoSource = 'camera' | 'library';

async function persistAsset(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
    throw new Error('A foto deve ter no máximo 5 MB.');
  }

  const directory = new Directory(Paths.document, 'medicines');
  directory.create({ idempotent: true, intermediates: true });
  const extension = asset.mimeType === 'image/png' ? 'png' : 'jpg';
  const destination = new File(directory, `${createId()}.${extension}`);
  await new File(asset.uri).copy(destination);
  return destination.uri;
}

export async function pickAndPersistPhoto(source: PhotoSource) {
  if (source === 'camera') {
    if (Platform.OS === 'ios' && !Device.isDevice) {
      throw new Error('O Simulador iOS não possui câmera. Teste em um iPhone físico ou escolha uma foto da galeria.');
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new PhotoPermissionError(
        permission.canAskAgain
          ? 'Permita o uso da câmera para tirar a foto.'
          : 'A câmera está bloqueada para o Zelo. Ative a permissão nos Ajustes do aparelho.',
      );
    }
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new PhotoPermissionError(
        permission.canAskAgain
          ? 'Permita o acesso às fotos para escolher uma imagem.'
          : 'O acesso às fotos está bloqueado. Ative a permissão nos Ajustes do aparelho.',
      );
    }
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) return null;
  return persistAsset(result.assets[0]);
}

export async function recoverPendingPhoto() {
  const result = await ImagePicker.getPendingResultAsync();
  if (!result) return null;
  if ('code' in result) throw new Error(result.message);
  if (result.canceled || !result.assets) return null;
  return persistAsset(result.assets[0]);
}

export function deleteStoredPhoto(uri: string | null) {
  if (!uri || !uri.startsWith(Paths.document.uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
