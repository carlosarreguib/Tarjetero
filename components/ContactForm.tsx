"use client";

import { BUSINESS_LINES, type BusinessLine, type ContactFormValues } from "@/lib/types";

type Props = {
  values: ContactFormValues;
  onChange: (v: ContactFormValues) => void;
};

const FIELDS: { key: keyof Omit<ContactFormValues, "note" | "business_lines">; label: string; type?: string; mode?: "tel" | "email" | "url" | "text"; autoComplete?: string }[] = [
  { key: "full_name", label: "Nombre" },
  { key: "company", label: "Empresa" },
  { key: "job_title", label: "Cargo" },
  { key: "phone", label: "Teléfono", type: "tel", mode: "tel" },
  { key: "email", label: "Correo", type: "email", mode: "email" },
  { key: "website", label: "Web", type: "text", mode: "url" },
];

export default function ContactForm({ values, onChange }: Props) {
  const set = <K extends keyof ContactFormValues>(k: K, v: ContactFormValues[K]) => onChange({ ...values, [k]: v });

  function toggle(line: BusinessLine) {
    const has = values.business_lines.includes(line);
    set("business_lines", has ? values.business_lines.filter((l) => l !== line) : [...values.business_lines, line]);
  }

  return (
    <div className="flex flex-col gap-3">
      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1 text-sm text-gray-600">
          {f.label}
          <input
            type={f.type ?? "text"}
            inputMode={f.mode}
            autoComplete="off"
            value={values[f.key]}
            onChange={(e) => set(f.key, e.target.value)}
            className="rounded border bg-white px-3 py-3 text-base text-gray-900"
          />
        </label>
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-gray-600">Línea de negocio</legend>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_LINES.map((line) => {
            const on = values.business_lines.includes(line);
            return (
              <button
                key={line}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(line)}
                className={`rounded-full border px-4 py-2 text-sm ${on ? "border-blue-700 bg-blue-700 text-white" : "bg-white text-gray-700"}`}
              >
                {line}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm text-gray-600">
        Nota
        <textarea
          rows={4}
          value={values.note}
          onChange={(e) => set("note", e.target.value)}
          className="rounded border bg-white px-3 py-3 text-base text-gray-900"
        />
      </label>
    </div>
  );
}
