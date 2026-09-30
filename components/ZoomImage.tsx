"use client";

import { useState } from "react";

/** Miniatura que se abre a pantalla completa; en móvil se puede hacer pellizco para ampliar. */
export default function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="max-h-56 w-full cursor-zoom-in rounded border bg-white object-contain"
      />
      {open && (
        <div
          role="dialog"
          aria-label="Foto de la tarjeta ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/90 p-2"
          style={{ touchAction: "pinch-zoom" }}
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
          <button className="fixed right-3 top-3 rounded bg-white px-3 py-2 text-sm font-medium" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}
