declare module 'expo-image-picker' {
  export interface ImagePickerAsset { uri: string; width: number; height: number }
  export interface ImagePickerResult { canceled: boolean; assets: ImagePickerAsset[] | null }
  export function launchImageLibraryAsync(options?: {
    mediaTypes?: string[] | string;
    quality?: number;
    allowsEditing?: boolean;
  }): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: { quality?: number }): Promise<ImagePickerResult>;
}
