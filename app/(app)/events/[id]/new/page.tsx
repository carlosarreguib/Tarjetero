import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaptureFlow from "@/components/CaptureFlow";

export default async function NewContactPage({ params }: PageProps<"/events/[id]/new">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id,name").eq("id", id).maybeSingle();
  if (!event) notFound();
  return <CaptureFlow eventId={event.id} eventName={event.name} />;
}
