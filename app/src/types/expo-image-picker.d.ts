declare module 'expo-image-picker' {
  export interface ImagePickerAsset { uri: string; width: number; height: number }
  export interface ImagePickerResult { canceled: boolean; assets: ImagePickerAsset[] | null }
  export interface PermissionResult { granted: boolean; status: string; canAskAgain?: boolean }
  export function launchImageLibraryAsync(options?: {
    mediaTypes?: string[] | string;
    quality?: number;
    allowsEditing?: boolean;
  }): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: { quality?: number; cameraType?: string; allowsEditing?: boolean }): Promise<ImagePickerResult>;
  export function requestCameraPermissionsAsync(): Promise<PermissionResult>;
  export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResult>;
  // The get* variants are what let us avoid re-prompting — and therefore avoid
  // presenting the picker while a permission alert is dismissing.
  export function getCameraPermissionsAsync(): Promise<PermissionResult>;
  export function getMediaLibraryPermissionsAsync(): Promise<PermissionResult>;
}
