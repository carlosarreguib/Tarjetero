import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type RepeatedContact = { match_key: string; full_name: string | null; company: string | null; events_count: number; contacts_count: number };
type RepeatedCompany = { company_norm: string; company: string | null; events_count: number; contacts_count: number };
type Occurrence = {
  id: string;
  full_name: string | null;
  company: string | null;
  email_norm: string | null;
  phone_norm: string | null;
  company_norm: string | null;
  event: { id: string; name: string } | null;
};

function EventLinks({ items }: { items: Occurrence[] }) {
  const seen = new Map<string, { id: string; name: string; contactId: string }>();
  for (const o of items) if (o.event && !seen.has(o.event.id)) seen.set(o.event.id, { ...o.event, contactId: o.id });
  return (
    <span className="flex flex-wrap gap-1">
      {[...seen.values()].map((e) => (
        <Link key={e.id} href={`/contacts/${e.contactId}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
          {e.name}
        </Link>
      ))}
    </span>
  );
}

export default async function RepeatedPage() {
  const supabase = await createClient();
  const [{ data: rc, error: e1 }, { data: rco, error: e2 }] = await Promise.all([
    supabase.from("repeated_contacts").select("*").order("events_count", { ascending: false }),
    supabase.from("repeated_companies").select("*").order("events_count", { ascending: false }),
  ]);
  if (e1 || e2) return <p className="text-red-700">No se pudieron cargar los repetidos: {(e1 ?? e2)!.message}</p>;

  const contacts = (rc ?? []) as RepeatedContact[];
  const companies = (rco ?? []) as RepeatedCompany[];

  const keys = contacts.map((c) => `"${c.match_key.replace(/"/g, "")}"`);
  const compKeys = companies.map((c) => `"${c.company_norm.replace(/"/g, "")}"`);
  const filters: string[] = [];
  if (keys.length) filters.push(`email_norm.in.(${keys.join(",")})`, `phone_norm.in.(${keys.join(",")})`);
  if (compKeys.length) filters.push(`company_norm.in.(${compKeys.join(",")})`);

  let occurrences: Occurrence[] = [];
  if (filters.length) {
    const { data } = await supabase
      .from("contacts")
      .select("id,full_name,company,email_norm,phone_norm,company_norm,event:events(id,name)")
      .or(filters.join(","));
    occurrences = (data ?? []) as unknown as Occurrence[];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Repetidos entre eventos</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Contactos (mismo correo o teléfono)</h2>
        {contacts.length === 0 && <p className="text-sm text-gray-500">No hay contactos repetidos todavía.</p>}
        <ul className="flex flex-col gap-2">
          {contacts.map((c) => (
            <li key={c.match_key} className="flex flex-col gap-1 rounded border bg-white p-3">
              <span className="font-medium">{c.full_name || c.match_key}</span>
              {c.company && <span className="text-sm text-gray-600">{c.company}</span>}
              <span className="text-xs text-gray-500">{c.events_count} eventos · {c.contacts_count} registros</span>
              <EventLinks items={occurrences.filter((o) => o.email_norm === c.match_key || o.phone_norm === c.match_key)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Empresas</h2>
        {companies.length === 0 && <p className="text-sm text-gray-500">No hay empresas repetidas todavía.</p>}
        <ul className="flex flex-col gap-2">
          {companies.map((c) => (
            <li key={c.company_norm} className="flex flex-col gap-1 rounded border bg-white p-3">
              <span className="font-medium">{c.company}</span>
              <span className="text-xs text-gray-500">{c.events_count} eventos · {c.contacts_count} contactos</span>
              <EventLinks items={occurrences.filter((o) => o.company_norm === c.company_norm)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
