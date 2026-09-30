"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setActiveEventId, useStoredActiveEventId } from "@/lib/activeEvent";
import { nullIfBlank, type EventRow } from "@/lib/types";

export type EventWithCount = EventRow & { contacts_count: number };

function formatDates(e: EventRow): string {
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es-ES");
  if (e.start_date && e.end_date) return `${fmt(e.start_date)} – ${fmt(e.end_date)}`;
  if (e.start_date) return fmt(e.start_date);
  return "";
}

export default function EventsView({ events }: { events: EventWithCount[] }) {
  const router = useRouter();
  const stored = useStoredActiveEventId();
  // Por defecto, el más reciente (la lista llega ordenada por creación descendente)
  const activeId = stored && events.some((e) => e.id === stored) ? stored : (events[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await createClient()
      .from("events")
      .insert({
        name: name.trim(),
        location: nullIfBlank(location),
        start_date: start || null,
        end_date: end || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      setError("No se pudo crear el evento. Comprueba la conexión e inténtalo de nuevo.");
      return;
    }
    setActiveEventId(data.id);
    setCreating(false);
    setName("");
    setLocation("");
    setStart("");
    setEnd("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eventos</h1>
        <button onClick={() => setCreating((v) => !v)} className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white">
          {creating ? "Cancelar" : "Nuevo evento"}
        </button>
      </div>

      {creating && (
        <form onSubmit={createEvent} className="flex flex-col gap-3 rounded border bg-white p-4">
          <input required placeholder="Nombre de la feria" value={name} onChange={(e) => setName(e.target.value)} className="rounded border px-3 py-2" />
          <input placeholder="Lugar" value={location} onChange={(e) => setLocation(e.target.value)} className="rounded border px-3 py-2" />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Inicio
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border px-2 py-2 text-base text-gray-900" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Fin
              <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className="rounded border px-2 py-2 text-base text-gray-900" />
            </label>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={busy || !name.trim()} className="rounded bg-blue-700 px-3 py-2 font-medium text-white disabled:opacity-50">
            {busy ? "Creando…" : "Crear evento"}
          </button>
        </form>
      )}

      {events.length === 0 && !creating && (
        <p className="rounded border border-dashed bg-white p-6 text-center text-sm text-gray-600">
          Todavía no hay eventos. Crea el primero con «Nuevo evento».
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {events.map((e) => {
          const active = e.id === activeId;
          return (
            <li key={e.id} className={`rounded border bg-white p-4 ${active ? "border-blue-600 ring-1 ring-blue-600" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <Link href={`/events/${e.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="text-sm text-gray-600">
                    {[e.location, formatDates(e)].filter(Boolean).join(" · ") || "Sin lugar ni fechas"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {e.contacts_count} {e.contacts_count === 1 ? "contacto" : "contactos"}
                  </p>
                </Link>
                {active ? (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">Activo</span>
                ) : (
                  <button
                    onClick={() => setActiveEventId(e.id)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    Marcar activo
                  </button>
                )}
              </div>
              {active && (
                <Link href={`/events/${e.id}/new`} className="mt-3 block rounded bg-blue-700 py-3 text-center font-medium text-white">
                  Añadir tarjeta
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
