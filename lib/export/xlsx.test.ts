import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildWorkbook, exportFileName, sanitizeCell, sanitizePhone, type ExportRow } from "./xlsx";
import type { ContactWithNames, EventRow } from "../types";

const event: EventRow = {
  id: "e1",
  name: "Chillventa 2026",
  location: "Núremberg",
  start_date: "2026-10-13",
  end_date: "2026-10-15",
  created_by: null,
  created_at: "2026-09-30T00:00:00Z",
};

function contact(over: Partial<ContactWithNames>): ContactWithNames {
  return {
    id: "c1",
    event_id: "e1",
    full_name: "Ana Núñez",
    company: "Frío Ibérico S.L.",
    job_title: "Directora",
    phone: "+34 600 000 000",
    email: "ana@frio.es",
    website: "www.frio.es",
    note: "Pedir oferta",
    business_lines: ["Refrigerantes", "Espumas"],
    card_image_path: null,
    created_by: "u1",
    created_at: "2026-09-30T00:00:00Z",
    updated_by: null,
    updated_at: "2026-09-30T00:00:00Z",
    creator: { full_name: "carlos" },
    updater: null,
    ...over,
  };
}

describe("sanitizeCell", () => {
  it("antepone apóstrofo a valores que empiezan fórmula", () => {
    expect(sanitizeCell("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(sanitizeCell("+34 1")).toBe("'+34 1");
    expect(sanitizeCell("-1+2")).toBe("'-1+2");
    expect(sanitizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
  it("deja intactos los valores normales y nulos", () => {
    expect(sanitizeCell("Ana")).toBe("Ana");
    expect(sanitizeCell(null)).toBe("");
  });
});

describe("sanitizePhone", () => {
  it("conserva + y ceros iniciales", () => {
    expect(sanitizePhone("+34 600 000 000")).toBe("+34 600 000 000");
    expect(sanitizePhone("0034 600 000 000")).toBe("0034 600 000 000");
  });
  it("sanea teléfonos que no lo parecen", () => {
    expect(sanitizePhone("=cmd|' /C calc'!A0")).toMatch(/^'=/);
  });
});

describe("exportFileName", () => {
  it("usa evento y fecha", () => {
    expect(exportFileName(["Chillventa 2026"], new Date(2026, 9, 13, 12))).toBe("contactos_chillventa-2026_2026-10-13.xlsx");
  });
  it("varios eventos", () => {
    expect(exportFileName(["A", "B"], new Date(2026, 0, 2, 12))).toBe("contactos_varios-eventos_2026-01-02.xlsx");
  });
});

describe("buildWorkbook", () => {
  it("genera cabecera en negrita, filtro, fila fija y teléfono como texto", async () => {
    const rows: ExportRow[] = [
      { event, contact: contact({}), repeated: true },
      { event, contact: contact({ id: "c2", full_name: "=1+1", phone: "0034600111222" }), repeated: false },
    ];
    const wb = await buildWorkbook(rows);
    const buf = await wb.xlsx.writeBuffer();
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf as ArrayBuffer);
    const ws = back.getWorksheet("Contactos")!;

    expect(ws.getRow(1).font?.bold).toBe(true);
    expect(ws.autoFilter).toBeTruthy();
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(ws.getRow(1).getCell(12).value).toBe("Repetido en otros eventos");

    const r2 = ws.getRow(2);
    expect(r2.getCell(3).value).toBe("Ana Núñez");
    expect(r2.getCell(6).value).toBe("+34 600 000 000");
    expect(typeof r2.getCell(6).value).toBe("string");
    expect(r2.getCell(9).value).toBe("Refrigerantes, Espumas");
    expect(r2.getCell(12).value).toBe("Sí");

    const r3 = ws.getRow(3);
    expect(r3.getCell(3).value).toBe("'=1+1");
    expect(r3.getCell(6).value).toBe("0034600111222");
    expect(r3.getCell(12).value).toBe("No");
  });
});
