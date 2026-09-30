import { describe, expect, it } from "vitest";
import { parseCardText } from "./parse";

const empty = { full_name: "", company: "", job_title: "", phone: "", email: "", website: "" };

const cases: { name: string; text: string; expected: Partial<typeof empty> }[] = [
  {
    name: "ES completa con S.L. y acentos",
    text: `Carlos Pérez Gómez
Director Comercial
QUÍMICAS DEL SUR S.L.
T +34 600 123 456
carlos.perez@quimicasdelsur.es
www.quimicasdelsur.es
Polígono Industrial La Chimenea, Nave 4
28300 Aranjuez (Madrid)`,
    expected: {
      full_name: "Carlos Pérez Gómez",
      job_title: "Director Comercial",
      company: "QUÍMICAS DEL SUR S.L.",
      phone: "+34 600 123 456",
      email: "carlos.perez@quimicasdelsur.es",
      website: "www.quimicasdelsur.es",
    },
  },
  {
    name: "EN con Ltd y móvil",
    text: `John Smith
Sales Manager
Acme Chemicals Ltd
Mobile: +44 7700 900123
john.smith@acmechem.co.uk
www.acmechem.com`,
    expected: {
      full_name: "John Smith",
      job_title: "Sales Manager",
      company: "Acme Chemicals Ltd",
      phone: "+44 7700 900123",
      email: "john.smith@acmechem.co.uk",
      website: "www.acmechem.com",
    },
  },
  {
    name: "DE con GmbH, Tel y Fax (ignora el fax)",
    text: `Hans Müller
Purchasing Manager
Kältetechnik Weber GmbH
Fax +49 89 1234568
Tel. +49 89 1234567
h.mueller@weber-kaelte.de
www.weber-kaelte.de`,
    expected: {
      full_name: "Hans Müller",
      job_title: "Purchasing Manager",
      company: "Kältetechnik Weber GmbH",
      phone: "+49 89 1234567",
      email: "h.mueller@weber-kaelte.de",
      website: "www.weber-kaelte.de",
    },
  },
  {
    name: "sin cargo; la web no se infiere del dominio del email",
    text: `María José Fernández
Frigoríficos Levante S.A.
Móvil 655 44 33 22
maria@frigolevante.com`,
    expected: {
      full_name: "María José Fernández",
      job_title: "",
      company: "Frigoríficos Levante S.A.",
      phone: "655 44 33 22",
      email: "maria@frigolevante.com",
      website: "",
    },
  },
  {
    name: "varios teléfonos: gana el primero con prefijo",
    text: `Pedro Sánchez
Responsable de Compras
Envases Torres S.L.U.
T: 938 123 456
M: 600 111 222
pedro@envasestorres.es`,
    expected: {
      full_name: "Pedro Sánchez",
      job_title: "Responsable de Compras",
      company: "Envases Torres S.L.U.",
      phone: "938 123 456",
      email: "pedro@envasestorres.es",
    },
  },
  {
    name: "teléfono sin prefijo y empresa deducida del dominio del email",
    text: `Laura Gil
CEO
Gil & Asociados
600123456
laura@gilasociados.com`,
    expected: {
      full_name: "Laura Gil",
      job_title: "CEO",
      company: "Gil & Asociados",
      phone: "600123456",
      email: "laura@gilasociados.com",
    },
  },
  {
    name: "empresa en mayúsculas sin sufijo",
    text: `Ana Ruiz
Technical Engineer
FRIOSUR
+34 911 222 333
ana.ruiz@friosur.com`,
    expected: {
      full_name: "Ana Ruiz",
      job_title: "Technical Engineer",
      company: "FRIOSUR",
      phone: "+34 911 222 333",
    },
  },
  {
    name: "FR con SAS y URL con https",
    text: `Marc Dubois
Export Sales
Chimie Alpes SAS
+33 4 76 12 34 56
marc@chimiealpes.fr
https://www.chimiealpes.fr/en`,
    expected: {
      full_name: "Marc Dubois",
      job_title: "Export Sales",
      company: "Chimie Alpes SAS",
      phone: "+33 4 76 12 34 56",
      website: "https://www.chimiealpes.fr/en",
    },
  },
  {
    name: "web como dominio sin www y email gmail",
    text: `Elena Vidal
Jefa de Ventas
Gases Vidal
elena.vidal@gmail.com
gasesvidal.es`,
    expected: {
      full_name: "Elena Vidal",
      job_title: "Jefa de Ventas",
      company: "Gases Vidal",
      email: "elena.vidal@gmail.com",
      website: "gasesvidal.es",
    },
  },
  {
    name: "ruido de OCR, prefijos E-mail/Web y (+34)",
    text: `|
Sergio Navarro Ibáñez
Gerente
Navarro Ibáñez e Hijos, S.L.
Tlf.: (+34) 96 123 45 67
E-mail: sergio@navarroibanez.es
Web: www.navarroibanez.es`,
    expected: {
      full_name: "Sergio Navarro Ibáñez",
      job_title: "Gerente",
      company: "Navarro Ibáñez e Hijos, S.L.",
      phone: "+34 96 123 45 67",
      email: "sergio@navarroibanez.es",
      website: "www.navarroibanez.es",
    },
  },
  {
    name: "solo empresa, sin persona",
    text: `TALLERES GARCÍA S.L.
Tel 976 555 444
info@talleresgarcia.com`,
    expected: {
      full_name: "",
      company: "TALLERES GARCÍA S.L.",
      phone: "976 555 444",
      email: "info@talleresgarcia.com",
    },
  },
  {
    name: "dirección y ciudad no se toman como nombre",
    text: `Avenida Diagonal
Barcelona España`,
    expected: { full_name: "" },
  },
  {
    name: "'Comercial' dentro del nombre de empresa no es un cargo",
    text: `Comercial Química S.L.
Rosa Molina
rosa@comercialquimica.es`,
    expected: {
      full_name: "Rosa Molina",
      job_title: "",
      company: "Comercial Química S.L.",
    },
  },
  {
    name: "nombre en mayúsculas",
    text: `JUAN PÉREZ LÓPEZ
Director General
Aerosoles Ibéricos S.A.
juan@aerosolesibericos.com`,
    expected: {
      full_name: "JUAN PÉREZ LÓPEZ",
      job_title: "Director General",
      company: "Aerosoles Ibéricos S.A.",
    },
  },
  {
    name: "texto vacío o basura no inventa nada",
    text: `  \n@@ ~~\n|\n`,
    expected: {},
  },
];

describe("parseCardText", () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(parseCardText(c.text)).toMatchObject(c.expected);
    });
  }

  it("texto vacío o basura devuelve todos los campos vacíos", () => {
    expect(parseCardText("")).toEqual(empty);
    expect(parseCardText("  \n@@ ~~\n|\n")).toEqual(empty);
  });
});
