import type { Worker } from "tesseract.js";
import { parseCardText } from "./parse";
import { preprocessForOcr } from "./preprocess";
import type { CardExtractor, CardFields } from "./types";

type ProgressFn = (progress: number, status: string) => void;

let workerPromise: Promise<Worker> | null = null;
let currentProgress: ProgressFn | null = null;

/** Carga perezosa: el worker y los datos de idioma solo se descargan al entrar en captura. */
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(({ createWorker }) =>
        createWorker("spa+eng", 1, {
          logger: (m) => currentProgress?.(m.progress ?? 0, m.status),
        }),
      )
      .catch((e) => {
        workerPromise = null;
        throw e;
      });
  }
  return workerPromise;
}

/** Precalienta el worker sin bloquear (llamar al abrir la pantalla de captura). */
export function warmUpOcr(): void {
  void getWorker().catch(() => {});
}

export function createTesseractExtractor(onProgress?: ProgressFn): CardExtractor {
  return {
    async extract(image: Blob): Promise<{ fields: CardFields; rawText: string }> {
      currentProgress = onProgress ?? null;
      try {
        const worker = await getWorker();
        const prepared = await preprocessForOcr(image);
        const { data } = await worker.recognize(prepared);
        const rawText = data.text ?? "";
        return { fields: parseCardText(rawText), rawText };
      } finally {
        currentProgress = null;
      }
    },
  };
}
