export const BUSINESS_LINES = ["Refrigerantes", "Propelentes", "Espumas", "Especialidades"] as const;
export type BusinessLine = (typeof BUSINESS_LINES)[number];

export type EventRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  event_id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  note: string | null;
  business_lines: BusinessLine[];
  card_image_path: string | null;
  email_norm?: string | null;
  phone_norm?: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
};

export type ContactWithNames = Contact & {
  creator: { full_name: string } | null;
  updater: { full_name: string } | null;
};

export type DuplicateMatch = {
  contact_id: string;
  full_name: string | null;
  company: string | null;
  event_name: string;
  registered_by: string | null;
  matched_on: string;
};

export type ContactFormValues = {
  full_name: string;
  company: string;
  job_title: string;
  phone: string;
  email: string;
  website: string;
  note: string;
  business_lines: BusinessLine[];
};

export const EMPTY_FORM: ContactFormValues = {
  full_name: "",
  company: "",
  job_title: "",
  phone: "",
  email: "",
  website: "",
  note: "",
  business_lines: [],
};

export const CONTACT_SELECT =
  "*, creator:profiles!contacts_created_by_fkey(full_name), updater:profiles!contacts_updated_by_fkey(full_name)";

/** Cadena vacía -> null para guardar en BD. */
export function nullIfBlank(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}
