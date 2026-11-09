import { requireOptionalNativeModule } from 'expo-modules-core';

type ArthosOcr = {
  recognize(uri: string): Promise<string>;
  /** Text of a (password-protected) PDF, extracted on the device. Rejects with code PDF_PASSWORD_REQUIRED / PDF_PASSWORD_WRONG. */
  pdfText(uri: string, password?: string | null): Promise<string>;
};

/** Null in Expo Go / web, where the native module isn't built in. */
export const ArthosOcrModule = requireOptionalNativeModule<ArthosOcr>('ArthosOcr');
