import { EMPTY_FIELDS, type CardFields } from "./types";

// Reglas simples y conservadoras: solo se rellena lo que se reconoce; nunca se inventa nada.

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i;
const URL_RE = /\b(?:https?:\/\/)?www\.[^\s,;|]+/i;
const DOMAIN_RE =
  /(?<![@\w.-])(?:[a-z0-9-]+\.)+(?:com|es|net|org|eu|de|fr|it|pt|uk|io|co|info|biz|cat|nl|be|ch|at|us|mx|cn)(?:\/[^\s,;|]*)?(?![\w@-])/i;
const PHONE_RE = /(?:\+|00)?\(?\+?\d[\d\s().-]{6,}\d/;
const PHONE_PREFIX_RE = /^\s*(?:t|tel|tlf|tfno|teléfono|telefono|phone|m|mob|móvil|movil|mobile|cel|cell)\b\.?\s*[:.]?/i;
const FAX_RE = /^\s*(?:f|fax)\b\.?\s*[:.]?/i;

const JOB_RE = new RegExp(
  "(?<![\\p{L}])(?:director|directora|gerente|responsable|jefe|jefa|ingeniero|ingeniera|comercial|manager|sales|engineer|ceo|cto|cfo|coo|technical|purchasing|ventas|compras|técnico|tecnico|presidente|presidenta|consultor|consultora|consultant|head|buyer|coordinador|coordinadora|delegado|delegada|administrador|administradora|socio|socia|partner|founder|fundador|fundadora|owner|propietario|export|account)(?![\\p{L}])",
  "iu",
);

const CORP_LONG_RE = /(?<![\p{L}\d])(?:GmbH|Ltd|Limited|Inc|LLC|Corp|Co\.?\s?Ltd)(?![\p{L}\d])\.?/iu;
const CORP_SHORT_RE =
  /(?<![\p{L}\d])(?:S\.\s?L\.\s?U?\.?|SLU?|S\.\s?A\.\s?U?\.?|SAU?|SAS|S\.A\.S\.?|B\.V\.|BV|AG|S\.r\.l\.|Srl|SRL|S\.p\.A\.|SpA|S\.L\.L\.|SLL)(?![\p{L}\d])/u;

const NOT_NAME_RE =
  /(?<![\p{L}])(?:calle|c\/|avda|avenida|paseo|plaza|polígono|poligono|nave|carretera|ctra|planta|edificio|street|road|str|españa|spain|madrid|barcelona|valencia|sevilla|germany|deutschland|portugal|france|italia|italy|tel|fax|email|web)(?![\p{L}])/iu;

const FREE_MAIL = new Set(["gmail", "hotmail", "outlook", "yahoo", "icloud", "live", "msn", "protonmail", "telefonica"]);

const PARTICLES = new Set(["de", "del", "la", "las", "los", "van", "von", "der", "da", "di", "y", "e"]);

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function stripContacts(line: string): string {
  return line.replace(new RegExp(EMAIL_RE.source, "gi"), " ").replace(new RegExp(URL_RE.source, "gi"), " ").trim();
}

function parseEmail(text: string): string {
  return text.match(EMAIL_RE)?.[0] ?? "";
}

function parseWebsite(lines: string[]): string {
  const withoutEmails = lines.map((l) => l.replace(new RegExp(EMAIL_RE.source, "gi"), " "));
  for (const re of [URL_RE, DOMAIN_RE]) {
    for (const line of withoutEmails) {
      const m = line.match(re);
      if (m) return m[0].replace(/[.,;]+$/, "");
    }
  }
  return "";
}

function normalizePhone(raw: string): string {
  return raw
    .replace(/\(\s*\+(\d+)\s*\)/g, "+$1")
    .replace(/^00/, "+")
    .replace(/\s+/g, " ")
    .trim();
}

function phoneFromLine(line: string): string | null {
  const clean = stripContacts(line);
  const m = clean.replace(PHONE_PREFIX_RE, "").match(PHONE_RE);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return normalizePhone(m[0]);
}

function parsePhone(lines: string[]): string {
  const candidates = lines.filter((l) => !FAX_RE.test(l));
  for (const line of candidates) {
    if (PHONE_PREFIX_RE.test(line) && /\d/.test(line.replace(PHONE_PREFIX_RE, ""))) {
      const p = phoneFromLine(line);
      if (p) return p;
    }
  }
  for (const line of candidates) {
    const p = phoneFromLine(line);
    if (p) return p;
  }
  return "";
}

function hasCorpSuffix(line: string): boolean {
  return CORP_LONG_RE.test(line) || CORP_SHORT_RE.test(line);
}

function isContactLine(line: string): boolean {
  return EMAIL_RE.test(line) || URL_RE.test(line) || DOMAIN_RE.test(line) || phoneFromLine(line) !== null || /\d{5,}/.test(line);
}

function isAllCaps(line: string): boolean {
  const letters = line.replace(/[^\p{L}]/gu, "");
  return letters.length >= 2 && letters === letters.toUpperCase();
}

function looksLikeName(line: string): boolean {
  if (/[\d@_/\\|:;,&()[\]{}<>*#=+]/.test(line) || NOT_NAME_RE.test(line)) return false;
  const words = line.trim().split(/\s+/);
  const significant = words.filter((w) => !PARTICLES.has(w.toLowerCase()));
  if (significant.length < 2 || significant.length > 4 || words.length > 6) return false;
  const title = /^\p{Lu}[\p{Ll}'’.-]+$/u;
  const caps = /^\p{Lu}[\p{Lu}'’.-]+$/u;
  const initial = /^\p{Lu}\.$/u;
  return significant.every((w) => title.test(w) || caps.test(w) || initial.test(w));
}

function domainLabels(email: string, website: string): string[] {
  const labels: string[] = [];
  const emailDomain = email.split("@")[1];
  if (emailDomain) labels.push(emailDomain.split(".")[0]);
  const web = website.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (web) labels.push(web.split(/[./]/)[0]);
  return labels.map(norm).filter((l) => l.length >= 4 && !FREE_MAIL.has(l));
}

export function parseCardText(rawText: string): CardFields {
  const fields: CardFields = { ...EMPTY_FIELDS };
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /[\p{L}\d]{2,}/u.test(l));

  fields.email = parseEmail(rawText);
  fields.website = parseWebsite(lines);
  fields.phone = parsePhone(lines);

  const used = new Set<number>();
  const free = (i: number) => !used.has(i);
  const isPlainText = (l: string) => !isContactLine(l);

  // Empresa: sufijo societario
  let companyIdx = lines.findIndex((l) => hasCorpSuffix(l) && isPlainText(l));
  // Empresa: coincidencia con el dominio del email o la web
  if (companyIdx < 0) {
    const labels = domainLabels(fields.email, fields.website);
    if (labels.length) {
      companyIdx = lines.findIndex((l) => {
        if (!isPlainText(l) || JOB_RE.test(l)) return false;
        const n = norm(l);
        return labels.some((lab) => n.length >= 4 && (n.includes(lab) || lab.includes(n)));
      });
    }
  }
  if (companyIdx >= 0) {
    fields.company = lines[companyIdx];
    used.add(companyIdx);
  }

  // Cargo: primera línea con palabra del diccionario que no sea la empresa
  const jobIdx = lines.findIndex((l, i) => free(i) && isPlainText(l) && JOB_RE.test(l));
  if (jobIdx >= 0) {
    fields.job_title = lines[jobIdx];
    used.add(jobIdx);
  }

  // Nombre: mejor una línea Title Case; si no, una en mayúsculas
  const nameCandidates = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l, i }) => free(i) && isPlainText(l) && !hasCorpSuffix(l) && looksLikeName(l));
  const nameIdx = (nameCandidates.find(({ l }) => !isAllCaps(l)) ?? nameCandidates[0])?.i ?? -1;
  if (nameIdx >= 0) {
    fields.full_name = lines[nameIdx];
    used.add(nameIdx);
  }

  // Empresa de respaldo: la línea restante más destacada (mayúsculas primero)
  if (!fields.company) {
    const rest = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => free(i) && isPlainText(l) && !NOT_NAME_RE.test(l) && /\p{L}{2,}/u.test(l) && !/[|~@]/.test(l));
    const pick = rest.find(({ l }) => isAllCaps(l)) ?? rest[0];
    if (pick) fields.company = pick.l;
  }

  return fields;
}
