// Análisis de exámenes (teoría clásica de los tests). Misma lógica que src/item_analysis.py.

import { round, roundHalfEven } from "./grading";

export type Respuestas = Record<string, string | null>[]; // una fila por estudiante
export type Clave = Record<string, string>;
export type Matriz = number[][]; // estudiantes x preguntas, 0/1

export interface Item {
  pregunta: string;
  dificultad: number;
  discriminacion: number;
  rPbis: number | null;
  diagnostico: string;
  calidad: "excelente" | "buena" | "mejorar" | "descartar" | "clave";
}

const norm = (v: string | null | undefined) => (v ?? "").toString().trim().toUpperCase();

export function calificar(resp: Respuestas, clave: Clave): Matriz {
  const preguntas = Object.keys(clave);
  const faltan = preguntas.filter((p) => resp.length && !(p in resp[0]));
  if (faltan.length) throw new Error(`La clave menciona preguntas que no están en los datos: ${faltan.join(", ")}`);
  return resp.map((fila) => preguntas.map((p) => (norm(fila[p]) !== "" && norm(fila[p]) === norm(clave[p]) ? 1 : 0)));
}

function validar(m: Matriz) {
  if (m.length < 2 || (m[0]?.length ?? 0) < 2) throw new Error("Se necesitan al menos 2 estudiantes y 2 preguntas.");
  if (m.some((f) => f.some((v) => v !== 0 && v !== 1))) throw new Error("Las puntuaciones por pregunta deben ser 0 o 1.");
}

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function varianza(xs: number[], ddof: number) {
  const mu = media(xs);
  return xs.reduce((s, x) => s + (x - mu) ** 2, 0) / (xs.length - ddof);
}
function correlacion(x: number[], y: number[]) {
  const mx = media(x);
  const my = media(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/** Confiabilidad KR-20 (alfa de Cronbach con ítems 0/1). */
export function kr20(m: Matriz): number {
  validar(m);
  const k = m[0].length;
  const totales = m.map((f) => f.reduce((a, b) => a + b, 0));
  const vt = varianza(totales, 1);
  if (vt === 0) return NaN;
  let spq = 0;
  for (let j = 0; j < k; j++) {
    const p = media(m.map((f) => f[j]));
    spq += p * (1 - p);
  }
  return (k / (k - 1)) * (1 - spq / vt);
}

export function diagnosticar(p: number, d: number, r: number | null): Pick<Item, "diagnostico" | "calidad"> {
  if (d < 0 || (r != null && r < -0.1)) return { diagnostico: "Revisar clave: discrimina al revés", calidad: "clave" };
  let texto: string;
  let calidad: Item["calidad"];
  if (d < 0.2) [texto, calidad] = ["Descartar o reformular", "descartar"];
  else if (d < 0.3) [texto, calidad] = ["Mejorar", "mejorar"];
  else if (d < 0.4) [texto, calidad] = ["Buena", "buena"];
  else [texto, calidad] = ["Excelente", "excelente"];
  if (p > 0.9) texto += " (muy fácil)";
  else if (p < 0.2) texto += " (muy difícil)";
  return { diagnostico: texto, calidad };
}

/** Dificultad, discriminación (27 % superior − inferior) y punto-biserial corregida. */
export function analizarItems(m: Matriz, preguntas: string[], grupo = 0.27): Item[] {
  validar(m);
  const n = m.length;
  const totales = m.map((f) => f.reduce((a, b) => a + b, 0));
  const g = Math.max(1, roundHalfEven(n * grupo));
  // Orden estable por puntaje (como sort_values(kind="mergesort")).
  const orden = totales.map((t, i) => [t, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, i]) => i);
  const inferior = orden.slice(0, g);
  const superior = orden.slice(-g);

  return preguntas.map((pregunta, j) => {
    const x = m.map((f) => f[j]);
    const resto = totales.map((t, i) => t - x[i]);
    const r = varianza(x, 0) === 0 || varianza(resto, 0) === 0 ? null : correlacion(x, resto);
    const p = media(x);
    const d = media(superior.map((i) => x[i])) - media(inferior.map((i) => x[i]));
    return {
      pregunta,
      dificultad: round(p, 3),
      discriminacion: round(d, 3),
      rPbis: r == null ? null : round(r, 3),
      ...diagnosticar(p, d, r),
    };
  });
}

export interface Distractor {
  opcion: string;
  proporcion: number;
  correcta: boolean;
}

export function distractores(resp: Respuestas, pregunta: string, correcta: string): Distractor[] {
  const cuenta = new Map<string, number>();
  for (const fila of resp) {
    const o = norm(fila[pregunta]) || "(blanco)";
    cuenta.set(o, (cuenta.get(o) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([opcion, c]) => ({ opcion, proporcion: round(c / resp.length, 3), correcta: opcion === norm(correcta) }))
    .sort((a, b) => a.opcion.localeCompare(b.opcion));
}
