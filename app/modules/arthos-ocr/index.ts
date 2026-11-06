import { requireOptionalNativeModule } from 'expo-modules-core';

type ArthosOcr = { recognize(uri: string): Promise<string> };

/** Null in Expo Go / web, where the native module isn't built in. */
export const ArthosOcrModule = requireOptionalNativeModule<ArthosOcr>('ArthosOcr');
