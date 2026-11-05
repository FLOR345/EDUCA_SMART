// Lectura de archivos (CSV / Excel) y conversión a estudiantes y respuestas.
// Todo ocurre en el navegador: ningún dato sale del equipo.

import Papa from "papaparse";
import { NOTA_MAX, NOTA_MIN, type Estudiante } from "./grading";
import type { Clave, Respuestas } from "./items";

export type Fila = Record<string, string>;

const NO_EVALUACION = new Set(["codigo", "código", "asistencia", "dni", "edad", "ciclo", "seccion", "sección"]);

export function aNumero(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function leerCSV(texto: string): Fila[] {
  const r = Papa.parse<Fila>(texto.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return r.data;
}

export async function leerArchivo(archivo: File): Promise<Fila[]> {
  const nombre = archivo.name.toLowerCase();
  if (nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) {
    const XLSX = await import("xlsx"); // se descarga sólo si se abre un Excel
    const libro = XLSX.read(await archivo.arrayBuffer());
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "", raw: false });
    return filas.map((f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k.trim(), String(v ?? "")])));
  }
  return leerCSV(await archivo.text());
}

const clave = (cols: string[], ...nombres: string[]) =>
  cols.find((c) => nombres.includes(c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")));

/** Columnas numéricas con al menos la mitad de valores y todos dentro de 0-20. */
export function columnasEvaluacion(filas: Fila[]): string[] {
  if (!filas.length) return [];
  const cols = Object.keys(filas[0]);
  return cols.filter((c) => {
    const base = c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (NO_EVALUACION.has(base) || ["apellidos", "nombres", "nombre"].includes(base)) return false;
    const vals = filas.map((f) => aNumero(f[c]));
    const validos = vals.filter((v): v is number => v != null && !Number.isNaN(v));
    if (validos.length < filas.length / 2) return false;
    return validos.every((v) => v >= NOTA_MIN && v <= NOTA_MAX);
  });
}

export interface ErrorDato {
  fila: number;
  columna: string;
  mensaje: string;
}

export function validarNotas(filas: Fila[], evaluaciones: string[]): ErrorDato[] {
  const errores: ErrorDato[] = [];
  filas.forEach((f, i) => {
    for (const ev of evaluaciones) {
      const v = aNumero(f[ev]);
      if (v == null) continue;
      if (Number.isNaN(v)) errores.push({ fila: i + 2, columna: ev, mensaje: `“${f[ev]}” no es un número` });
      else if (v < NOTA_MIN || v > NOTA_MAX) errores.push({ fila: i + 2, columna: ev, mensaje: `${v} está fuera de 0-20` });
    }
  });
  return errores;
}

export function aEstudiantes(filas: Fila[], evaluaciones: string[]): Estudiante[] {
  if (!filas.length) return [];
  const cols = Object.keys(filas[0]);
  const cCodigo = clave(cols, "codigo", "id", "dni") ?? cols[0];
  const cApellidos = clave(cols, "apellidos", "apellido");
  const cNombres = clave(cols, "nombres", "nombre");
  const cSeccion = clave(cols, "seccion", "grupo", "turno");
  const cAsistencia = clave(cols, "asistencia");
  const asis = cAsistencia ? filas.map((f) => aNumero(f[cAsistencia])) : [];
  const enPorcentaje = asis.some((a) => a != null && a > 1);
  return filas.map((f, i) => {
    const a = asis[i];
    return {
      codigo: String(f[cCodigo] ?? i + 1),
      apellidos: cApellidos ? f[cApellidos] : "",
      nombres: cNombres ? f[cNombres] : "",
      seccion: cSeccion ? f[cSeccion] || null : null,
      asistencia: a == null || Number.isNaN(a) ? null : enPorcentaje ? a / 100 : a,
      notas: Object.fromEntries(
        evaluaciones.map((ev) => {
          const v = aNumero(f[ev]);
          return [ev, v == null || Number.isNaN(v) ? null : v];
        }),
      ),
    };
  });
}

export function aRespuestas(filas: Fila[]): { respuestas: Respuestas; preguntas: string[]; ids: string[] } {
  if (!filas.length) return { respuestas: [], preguntas: [], ids: [] };
  const cols = Object.keys(filas[0]);
  const idCols = cols.filter((c) => ["codigo", "código", "id", "dni", "nombre", "nombres"].includes(c.toLowerCase()));
  const preguntas = cols.filter((c) => !idCols.includes(c));
  return {
    respuestas: filas.map((f) => Object.fromEntries(preguntas.map((p) => [p, f[p] ?? null]))),
    preguntas,
    ids: filas.map((f, i) => (idCols[0] ? f[idCols[0]] : String(i + 1))),
  };
}

export function aClave(filas: Fila[]): Clave {
  if (!filas.length) return {};
  const [cp, cc] = Object.keys(filas[0]);
  return Object.fromEntries(filas.map((f) => [String(f[cp]).trim(), String(f[cc]).trim()]));
}

export function nombreCompleto(e: Pick<Estudiante, "apellidos" | "nombres" | "codigo">): string {
  const n = [e.apellidos, e.nombres].filter(Boolean).join(", ");
  return n || e.codigo;
}
