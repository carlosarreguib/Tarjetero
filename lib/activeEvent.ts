import { useSyncExternalStore } from "react";

const KEY = "ferias.activeEvent";
const CHANGE = "ferias:active-event";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE, cb);
  };
}

/** Id guardado en el dispositivo (null en servidor o si no hay). */
export function useStoredActiveEventId(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function setActiveEventId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // almacenamiento no disponible: se usa el evento más reciente por defecto
  }
  window.dispatchEvent(new Event(CHANGE));
}
