const MAX_SIDE = 1600;

async function toCanvas(image: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(image, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo codificar la imagen"))), type, quality),
  );
}

/** Reduce a ~1600 px, pasa a escala de grises y estira el contraste (percentiles 2-98). */
export async function preprocessForOcr(image: Blob): Promise<Blob> {
  const canvas = await toCanvas(image);
  const ctx = canvas.getContext("2d")!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;

  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = px[i + 1] = px[i + 2] = g;
    hist[g]++;
  }

  const total = px.length / 4;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255; lo++) if ((acc += hist[lo]) >= total * 0.02) break;
  for (let acc = 0; hi > 0; hi--) if ((acc += hist[hi]) >= total * 0.02) break;
  const range = Math.max(1, hi - lo);

  for (let i = 0; i < px.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvasToBlob(canvas, "image/png");
}

/** JPEG ~0.7, máx. 1600 px (objetivo <300 KB). Si se pasa, baja calidad. */
export async function compressForUpload(image: Blob, maxBytes = 300 * 1024): Promise<Blob> {
  const canvas = await toCanvas(image);
  let quality = 0.7;
  let out = await canvasToBlob(canvas, "image/jpeg", quality);
  while (out.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    out = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  return out;
}
