import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export async function scanBarcode() {
  const { camera } = await BarcodeScanner.requestPermissions();

  if (camera !== 'granted') {
    throw new Error('Camera permission was not granted');
  }

  const result = await BarcodeScanner.scan();

  return result.barcodes?.[0]?.rawValue ?? null;
}