// Утилита для сжатия изображений перед загрузкой на сервер.
// Сжимает фото с камеры (часто 5-10 МБ) до разумного размера ~1 МБ,
// что ускоряет загрузку и AI-распознавание чеков в 3-5 раз.

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const JPEG_QUALITY = 0.72;
const MAX_SIZE_BYTES = 1_500_000; // 1.5 МБ — если после сжатия больше, понижаем quality

export async function compressImage(file) {
  // Не изображение или PDF — отдаём как есть
  if (!file.type || !file.type.startsWith('image/')) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    // Пропорционально уменьшаем, если слишком большое
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Пробуем сжать; если всё ещё слишком большое — понижаем quality
    let quality = JPEG_QUALITY;
    let blob = canvas.toDataURL('image/jpeg', quality);
    let sizeBytes = dataUrlSize(blob);

    while (sizeBytes > MAX_SIZE_BYTES && quality > 0.3) {
      quality -= 0.15;
      blob = canvas.toDataURL('image/jpeg', quality);
      sizeBytes = dataUrlSize(blob);
    }

    const arr = blob.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);

    bitmap.close?.();
    return new File([u8], 'receipt.jpg', { type: 'image/jpeg' });
  } catch (e) {
    // Если canvas/Blob недоступны — отдаём оригинал
    return file;
  }
}

function dataUrlSize(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}