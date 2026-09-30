import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_SELECT, type ContactWithNames, type EventRow } from "@/lib/types";
import ContactList from "@/components/ContactList";

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: contacts, error }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("contacts").select(CONTACT_SELECT).eq("event_id", id).order("created_at", { ascending: false }),
  ]);
  if (!event) notFound();
  const ev = event as EventRow;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/" className="text-sm text-blue-700">← Eventos</Link>
        <h1 className="mt-1 text-xl font-semibold">{ev.name}</h1>
        {ev.location && <p className="text-sm text-gray-600">{ev.location}</p>}
      </div>
      <Link href={`/events/${id}/new`} className="rounded bg-blue-700 py-3 text-center font-medium text-white">
        Añadir tarjeta
      </Link>
      {error ? (
        <p className="text-red-700">No se pudieron cargar los contactos: {error.message}</p>
      ) : (
        <ContactList event={ev} contacts={(contacts ?? []) as ContactWithNames[]} />
      )}
    </div>
  );
}
