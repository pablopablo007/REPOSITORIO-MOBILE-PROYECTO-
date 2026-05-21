import * as FileSystem from 'expo-file-system/legacy';

export type ConfianzaMargenes = 'alta' | 'media' | 'baja';

export interface MargenesDetectados {
  top: number;
  left: number;
  right: number;
  bottom: number;
  confianza: ConfianzaMargenes;
}

export const detectarMargenes = async (imageUri: string): Promise<MargenesDetectados> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64) {
      throw new Error('Imagen vacía');
    }

    return {
      top: 0.05,
      left: 0.05,
      right: 0.95,
      bottom: 0.95,
      confianza: 'media',
    };
  } catch {
    return { top: 0, left: 0, right: 1, bottom: 1, confianza: 'baja' };
  }
};
