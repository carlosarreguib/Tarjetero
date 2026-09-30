import type ExcelJS from "exceljs";
import type { ContactWithNames, EventRow } from "../types";

export type ExportRow = { event: EventRow; contact: ContactWithNames; repeated: boolean };

const PHONE_OK_RE = /^\+?[\d\s().-]+$/;
const FORMULA_START_RE = /^[=+\-@\t\r]/;

/** Neutraliza inyección de fórmulas: antepone apóstrofo si el valor empezaría una fórmula. */
export function sanitizeCell(value: string | null | undefined): string {
  const v = value ?? "";
  return FORMULA_START_RE.test(v) ? `'${v}` : v;
}

/** Los teléfonos válidos se dejan intactos (+ y ceros); cualquier otra cosa se sanea como texto. */
export function sanitizePhone(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return PHONE_OK_RE.test(v) ? v : sanitizeCell(v);
}

function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "evento"
  );
}

export function exportFileName(eventNames: string[], date = new Date()): string {
  const name = eventNames.length === 1 ? slug(eventNames[0]) : "varios-eventos";
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return `contactos_${name}_${d}.xlsx`;
}

const COLUMNS: { header: string; key: string; width: number }[] = [
  { header: "Evento", key: "event", width: 26 },
  { header: "Fecha", key: "date", width: 12 },
  { header: "Nombre", key: "name", width: 26 },
  { header: "Empresa", key: "company", width: 28 },
  { header: "Cargo", key: "job", width: 24 },
  { header: "Teléfono", key: "phone", width: 18 },
  { header: "Correo", key: "email", width: 30 },
  { header: "Web", key: "web", width: 28 },
  { header: "Línea de negocio", key: "lines", width: 26 },
  { header: "Nota", key: "note", width: 40 },
  { header: "Registrado por", key: "by", width: 18 },
  { header: "Repetido en otros eventos", key: "repeated", width: 16 },
];

export async function buildWorkbook(rows: ExportRow[]): Promise<ExcelJS.Workbook> {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  const ws = wb.addWorksheet("Contactos", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS;

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", wrapText: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const phoneCol = COLUMNS.findIndex((c) => c.key === "phone") + 1;
  ws.getColumn(phoneCol).numFmt = "@";

  for (const { event, contact: c, repeated } of rows) {
    const row = ws.addRow({
      event: sanitizeCell(event.name),
      date: sanitizeCell(event.start_date ?? ""),
      name: sanitizeCell(c.full_name),
      company: sanitizeCell(c.company),
      job: sanitizeCell(c.job_title),
      phone: sanitizePhone(c.phone),
      email: sanitizeCell(c.email),
      web: sanitizeCell(c.website),
      lines: c.business_lines.join(", "),
      note: sanitizeCell(c.note),
      by: sanitizeCell(c.creator?.full_name),
      repeated: repeated ? "Sí" : "No",
    });
    row.getCell(phoneCol).numFmt = "@";
    row.getCell("note").alignment = { wrapText: true, vertical: "top" };
  }
  return wb;
}

export async function downloadXlsx(rows: ExportRow[], eventNames: string[]): Promise<void> {
  const wb = await buildWorkbook(rows);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(eventNames);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
