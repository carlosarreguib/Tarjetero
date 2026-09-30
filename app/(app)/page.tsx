import { createClient } from "@/lib/supabase/server";
import EventsView, { type EventWithCount } from "@/components/EventsView";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, contacts(count)")
    .order("created_at", { ascending: false });

  if (error) return <p className="text-red-700">No se pudieron cargar los eventos: {error.message}</p>;

  const events: EventWithCount[] = (data ?? []).map((e) => ({
    ...e,
    contacts_count: e.contacts?.[0]?.count ?? 0,
  }));

  return <EventsView events={events} />;
}
