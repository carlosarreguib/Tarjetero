import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactWithNames } from "../types";

type NormRow = { event_id: string; email_norm: string | null; phone_norm: string | null };

/**
 * Devuelve el conjunto de ids de contacto cuyo email o teléfono (normalizados)
 * aparece también en un evento distinto al suyo.
 */
export async function findRepeatedIds(supabase: SupabaseClient, contacts: ContactWithNames[]): Promise<Set<string>> {
  const emails = [...new Set(contacts.map((c) => c.email_norm).filter(Boolean))] as string[];
  const phones = [...new Set(contacts.map((c) => c.phone_norm).filter(Boolean))] as string[];
  const repeated = new Set<string>();
  if (!emails.length && !phones.length) return repeated;

  const rows: NormRow[] = [];
  const chunk = 100;
  for (let i = 0; i < Math.max(emails.length, phones.length); i += chunk) {
    const parts: string[] = [];
    const e = emails.slice(i, i + chunk);
    const p = phones.slice(i, i + chunk);
    if (e.length) parts.push(`email_norm.in.(${e.map((x) => `"${x.replace(/"/g, "")}"`).join(",")})`);
    if (p.length) parts.push(`phone_norm.in.(${p.map((x) => `"${x}"`).join(",")})`);
    const { data, error } = await supabase.from("contacts").select("event_id,email_norm,phone_norm").or(parts.join(","));
    if (error) throw error;
    rows.push(...((data ?? []) as NormRow[]));
  }

  const eventsByEmail = new Map<string, Set<string>>();
  const eventsByPhone = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.email_norm) (eventsByEmail.get(r.email_norm) ?? eventsByEmail.set(r.email_norm, new Set()).get(r.email_norm)!).add(r.event_id);
    if (r.phone_norm) (eventsByPhone.get(r.phone_norm) ?? eventsByPhone.set(r.phone_norm, new Set()).get(r.phone_norm)!).add(r.event_id);
  }

  const other = (set: Set<string> | undefined, eventId: string) => !!set && [...set].some((id) => id !== eventId);
  for (const c of contacts) {
    const n = c;
    if ((n.email_norm && other(eventsByEmail.get(n.email_norm), c.event_id)) || (n.phone_norm && other(eventsByPhone.get(n.phone_norm), c.event_id))) {
      repeated.add(c.id);
    }
  }
  return repeated;
}
