import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_SELECT, type ContactWithNames } from "@/lib/types";
import ContactEditor from "@/components/ContactEditor";

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const { data: contact } = await supabase
    .from("contacts")
    .select(`${CONTACT_SELECT}, event:events(id,name)`)
    .eq("id", id)
    .maybeSingle();
  if (!contact) notFound();

  const c = contact as ContactWithNames & { event: { id: string; name: string } | null };
  return <ContactEditor contact={c} eventName={c.event?.name ?? ""} isOwner={claims?.claims.sub === c.created_by} />;
}
