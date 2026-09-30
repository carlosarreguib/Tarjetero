"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nullIfBlank, type ContactFormValues, type ContactWithNames } from "@/lib/types";
import ContactForm from "./ContactForm";
import ZoomImage from "./ZoomImage";

type Props = { contact: ContactWithNames; eventName: string; isOwner: boolean };

const fmt = (d: string) => new Date(d).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });

export default function ContactEditor({ contact, eventName, isOwner }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ContactFormValues>({
    full_name: contact.full_name ?? "",
    company: contact.company ?? "",
    job_title: contact.job_title ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    website: contact.website ?? "",
    note: contact.note ?? "",
    business_lines: contact.business_lines,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!contact.card_image_path) return;
    // URL firmada de corta duración (5 min)
    createClient()
      .storage.from("cards")
      .createSignedUrl(contact.card_image_path, 300)
      .then(({ data }) => setImageUrl(data?.signedUrl ?? null));
  }, [contact.card_image_path]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const { error } = await createClient()
      .from("contacts")
      .update({
        full_name: nullIfBlank(values.full_name),
        company: nullIfBlank(values.company),
        job_title: nullIfBlank(values.job_title),
        phone: nullIfBlank(values.phone),
        email: nullIfBlank(values.email),
        website: nullIfBlank(values.website),
        note: nullIfBlank(values.note),
        business_lines: values.business_lines,
      })
      .eq("id", contact.id);
    setSaving(false);
    if (error) {
      setMessage({ kind: "error", text: "No se pudo guardar. Tus cambios siguen aquí; inténtalo de nuevo." });
      return;
    }
    setMessage({ kind: "ok", text: "Cambios guardados." });
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("¿Eliminar este contacto y su foto? No se puede deshacer.")) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("contacts").delete().eq("id", contact.id).select("id");
    if (error || !data?.length) {
      setSaving(false);
      setMessage({ kind: "error", text: "No se pudo eliminar (solo puedes borrar tus propios contactos)." });
      return;
    }
    if (contact.card_image_path) await supabase.storage.from("cards").remove([contact.card_image_path]);
    router.replace(`/events/${contact.event_id}`);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div>
        <Link href={`/events/${contact.event_id}`} className="text-sm text-blue-700">← {eventName || "Evento"}</Link>
        <h1 className="mt-1 text-xl font-semibold">{contact.full_name || contact.company || "Contacto"}</h1>
      </div>

      {imageUrl && <ZoomImage src={imageUrl} alt="Foto de la tarjeta" />}

      <ContactForm values={values} onChange={setValues} />

      <p className="text-xs text-gray-500">
        Creado por {contact.creator?.full_name ?? "—"} el {fmt(contact.created_at)}
        {contact.updated_by && (
          <>
            <br />
            Modificado por {contact.updater?.full_name ?? "—"} el {fmt(contact.updated_at)}
          </>
        )}
      </p>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`rounded p-3 text-sm ${message.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <button disabled={saving} className="rounded bg-blue-700 py-3 font-medium text-white disabled:opacity-50">
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
      {isOwner && (
        <button type="button" disabled={saving} onClick={remove} className="rounded border border-red-600 py-3 font-medium text-red-700 disabled:opacity-50">
          Eliminar
        </button>
      )}
    </form>
  );
}
