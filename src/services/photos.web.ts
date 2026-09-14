import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

export async function pickAndPersistPhoto(source: PhotoSource) {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
    throw new Error('A foto deve ter no máximo 5 MB.');
  }
  return asset.uri;
}

export async function recoverPendingPhoto() {
  return null;
}

export function deleteStoredPhoto(_uri: string | null) {}
