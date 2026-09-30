import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactFormValues, DuplicateMatch } from "./types";

export const MATCH_LABEL: Record<string, string> = {
  email: "el correo",
  "teléfono": "el teléfono",
  "empresa y nombre": "la empresa y el nombre",
};

export async function findDuplicates(
  supabase: SupabaseClient,
  v: Pick<ContactFormValues, "email" | "phone" | "company" | "full_name">,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const { data, error } = await supabase.rpc("find_duplicates", {
    p_email: v.email,
    p_phone: v.phone,
    p_company: v.company,
    p_name: v.full_name,
    p_exclude: excludeId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as DuplicateMatch[];
}
