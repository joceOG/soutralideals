/**
 * Réduit une image avant envoi (Cloudinary).
 * Les photos téléphone de 4–10 Mo sont le principal facteur des enregistrements ~1 min.
 */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;
const SKIP_UNDER_BYTES = 350 * 1024;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const alreadySmall = file.size <= SKIP_UNDER_BYTES && scale === 1;
    if (alreadySmall) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const keepPng = file.type === 'image/png';
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        keepPng ? 'image/png' : 'image/jpeg',
        keepPng ? undefined : JPEG_QUALITY,
      );
    });
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, '');
    const name = `${base}${keepPng ? '.png' : '.jpg'}`;
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
