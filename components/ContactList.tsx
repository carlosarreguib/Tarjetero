"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_LINES, type BusinessLine, type ContactWithNames, type EventRow } from "@/lib/types";
import { downloadXlsx, type ExportRow } from "@/lib/export/xlsx";
import { findRepeatedIds } from "@/lib/export/repeated";

type Props = { event: EventRow; contacts: ContactWithNames[] };

function Lines({ lines }: { lines: BusinessLine[] }) {
  if (!lines.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {lines.map((l) => (
        <span key={l} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">{l}</span>
      ))}
    </span>
  );
}

export default function ContactList({ event, contacts }: Props) {
  const [q, setQ] = useState("");
  const [line, setLine] = useState<BusinessLine | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (line && !c.business_lines.includes(line)) return false;
      if (!needle) return true;
      return [c.full_name, c.company, c.job_title, c.email, c.phone, c.website, c.note]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle));
    });
  }, [contacts, q, line]);

  async function exportExcel() {
    setBusy(true);
    setError(null);
    try {
      const repeated = await findRepeatedIds(createClient(), filtered);
      const rows: ExportRow[] = filtered.map((contact) => ({ event, contact, repeated: repeated.has(contact.id) }));
      await downloadXlsx(rows, [event.name]);
    } catch {
      setError("No se pudo generar el Excel. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar por nombre, empresa, correo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded border bg-white px-3 py-2"
        />
        <select value={line} onChange={(e) => setLine(e.target.value as BusinessLine | "")} className="rounded border bg-white px-3 py-2">
          <option value="">Todas las líneas</option>
          {BUSINESS_LINES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button onClick={exportExcel} disabled={busy || filtered.length === 0} className="rounded border border-blue-700 px-3 py-2 text-blue-700 disabled:opacity-50">
          {busy ? "Generando…" : "Exportar a Excel"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-sm text-gray-500">
        {filtered.length} de {contacts.length} {contacts.length === 1 ? "contacto" : "contactos"}
      </p>

      {/* Móvil: tarjetas */}
      <ul className="flex flex-col gap-2 md:hidden">
        {filtered.map((c) => (
          <li key={c.id}>
            <Link href={`/contacts/${c.id}`} className="flex flex-col gap-1 rounded border bg-white p-3">
              <span className="font-medium">{c.full_name || c.company || "(sin nombre)"}</span>
              {c.full_name && c.company && <span className="text-sm text-gray-600">{c.company}</span>}
              {c.job_title && <span className="text-sm text-gray-500">{c.job_title}</span>}
              <Lines lines={c.business_lines} />
            </Link>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded border bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              {["Nombre", "Empresa", "Cargo", "Teléfono", "Correo", "Línea de negocio", "Registrado por"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2"><Link href={`/contacts/${c.id}`} className="text-blue-700 underline">{c.full_name || "(sin nombre)"}</Link></td>
                <td className="px-3 py-2">{c.company}</td>
                <td className="px-3 py-2">{c.job_title}</td>
                <td className="px-3 py-2">{c.phone}</td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2"><Lines lines={c.business_lines} /></td>
                <td className="px-3 py-2">{c.creator?.full_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contacts.length === 0 && (
        <p className="rounded border border-dashed bg-white p-6 text-center text-sm text-gray-600">
          Aún no hay contactos en este evento.
        </p>
      )}
    </div>
  );
}
