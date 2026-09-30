"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTesseractExtractor, warmUpOcr } from "@/lib/ocr/tesseract";
import { compressForUpload } from "@/lib/ocr/preprocess";
import { findDuplicates, MATCH_LABEL } from "@/lib/duplicates";
import { newId } from "@/lib/uuid";
import { EMPTY_FORM, nullIfBlank, type ContactFormValues, type DuplicateMatch } from "@/lib/types";
import ContactForm from "./ContactForm";
import ZoomImage from "./ZoomImage";

type Step = "choose" | "processing" | "review" | "saved";

export default function CaptureFlow({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [step, setStep] = useState<Step>("choose");
  const [values, setValues] = useState<ContactFormValues>(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);

  // Un id por tarjeta: permite reintentar sin duplicar ni volver a subir la foto.
  const contactId = useRef(newId());
  const imageBlob = useRef<Blob | null>(null);
  const uploadedPath = useRef<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    warmUpOcr();
  }, []);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  function reset() {
    contactId.current = newId();
    imageBlob.current = null;
    uploadedPath.current = null;
    setValues(EMPTY_FORM);
    setImageUrl(null);
    setNotice(null);
    setSaveError(null);
    setDuplicates(null);
    setProgress(0);
    setStep("choose");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    imageBlob.current = file;
    setImageUrl(URL.createObjectURL(file));
    setStep("processing");
    setProgress(0);
    try {
      const extractor = createTesseractExtractor((p) => setProgress(p));
      const { fields } = await extractor.extract(file);
      setValues({ ...EMPTY_FORM, ...fields });
      const found = Object.values(fields).some(Boolean);
      setNotice(found ? "Revisa los datos: el reconocimiento automático puede equivocarse." : "No se detectó texto. Rellena los campos a mano.");
    } catch {
      setNotice("No se pudo leer la tarjeta. Rellena los campos a mano.");
    }
    setStep("review");
  }

  function manual() {
    setValues(EMPTY_FORM);
    setNotice(null);
    setStep("review");
  }

  async function persist() {
    const supabase = createClient();
    // 1) Foto (solo una vez, aunque se reintente el guardado)
    if (imageBlob.current && !uploadedPath.current) {
      const jpeg = await compressForUpload(imageBlob.current);
      const path = `${eventId}/${contactId.current}.jpg`;
      const { error } = await supabase.storage.from("cards").upload(path, jpeg, { contentType: "image/jpeg" });
      // "already exists": una subida previa llegó aunque la respuesta se perdiera
      if (error && !/exists|duplicate/i.test(error.message)) throw error;
      uploadedPath.current = path;
    }
    // 2) Contacto
    const { error } = await supabase.from("contacts").insert({
      id: contactId.current,
      event_id: eventId,
      full_name: nullIfBlank(values.full_name),
      company: nullIfBlank(values.company),
      job_title: nullIfBlank(values.job_title),
      phone: nullIfBlank(values.phone),
      email: nullIfBlank(values.email),
      website: nullIfBlank(values.website),
      note: nullIfBlank(values.note),
      business_lines: values.business_lines,
      card_image_path: uploadedPath.current,
    });
    // 23505: el insert anterior sí llegó; se da por guardado
    if (error && error.code !== "23505") throw error;
  }

  async function save(skipDuplicateCheck: boolean) {
    setSaving(true);
    setSaveError(null);
    try {
      if (!skipDuplicateCheck) {
        try {
          const dups = await findDuplicates(createClient(), values);
          if (dups.length) {
            setDuplicates(dups);
            return;
          }
        } catch {
          // si la comprobación falla no se bloquea el guardado
        }
      }
      setDuplicates(null);
      await persist();
      setStep("saved");
    } catch {
      setSaveError("No se pudo guardar. Tus datos siguen aquí: comprueba la conexión y pulsa «Reintentar».");
    } finally {
      setSaving(false);
    }
  }

  const hasContent = Object.entries(values).some(([k, v]) => (k === "business_lines" ? (v as string[]).length : String(v).trim()));

  if (step === "saved") {
    return (
      <div className="flex flex-col gap-3 rounded border bg-white p-6 text-center">
        <p className="text-lg font-semibold text-green-700">Contacto guardado</p>
        <button onClick={reset} className="rounded bg-blue-700 py-3 font-medium text-white">Añadir otra tarjeta</button>
        <Link href={`/events/${eventId}`} className="rounded border py-3">Ver la lista</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/events/${eventId}`} className="text-sm text-blue-700">← {eventName}</Link>
        <h1 className="mt-1 text-xl font-semibold">Añadir tarjeta</h1>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

      {step === "choose" && (
        <div className="flex flex-col gap-3">
          <button onClick={() => cameraRef.current?.click()} className="rounded-lg bg-blue-700 py-6 text-lg font-semibold text-white">
            Hacer foto
          </button>
          <button onClick={() => galleryRef.current?.click()} className="rounded-lg border bg-white py-4 font-medium">
            Subir imagen
          </button>
          <button onClick={manual} className="rounded-lg border bg-white py-4 font-medium">
            Introducir a mano
          </button>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col gap-3">
          {imageUrl && <ZoomImage src={imageUrl} alt="Tarjeta fotografiada" />}
          <div className="rounded border bg-white p-4">
            <p className="text-sm text-gray-700">Leyendo la tarjeta… (la primera vez descarga los datos de idioma)</p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-gray-200">
              <div className="h-full bg-blue-700 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {step === "review" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
          className="flex flex-col gap-4"
        >
          {imageUrl && <ZoomImage src={imageUrl} alt="Tarjeta fotografiada" />}
          {notice && <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}
          <ContactForm values={values} onChange={setValues} />

          {duplicates && (
            <div role="alert" className="rounded border border-amber-400 bg-amber-50 p-4">
              <p className="font-medium text-amber-900">Puede que este contacto ya exista</p>
              <ul className="mt-2 flex flex-col gap-3">
                {duplicates.map((d) => (
                  <li key={d.contact_id} className="text-sm text-amber-900">
                    <b>{d.full_name || "(sin nombre)"}</b>{d.company ? ` · ${d.company}` : ""}
                    <br />
                    Evento: {d.event_name} · Registrado por: {d.registered_by ?? "—"}
                    <br />
                    Coincide {MATCH_LABEL[d.matched_on] ?? d.matched_on}.{" "}
                    <Link href={`/contacts/${d.contact_id}`} target="_blank" className="font-medium text-blue-700 underline">
                      Ver el existente
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" disabled={saving} onClick={() => save(true)} className="mt-3 w-full rounded bg-amber-700 py-3 font-medium text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar de todos modos"}
              </button>
            </div>
          )}

          {saveError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={reset} className="rounded border bg-white px-4 py-3">Descartar</button>
            <button disabled={saving || !hasContent} className="flex-1 rounded bg-blue-700 py-3 font-medium text-white disabled:opacity-50">
              {saving ? "Guardando…" : saveError ? "Reintentar" : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
