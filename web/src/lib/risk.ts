// Alerta temprana de riesgo académico. Misma lógica que src/risk.py.
// Índice transparente: cada factor (0 = sin riesgo, 1 = máximo) se puede explicar.

import { NOTA_APROBATORIA, round, validarPesos, type Estudiante, type Pesos } from "./grading";

export const FACTORES = ["rendimiento", "asistencia", "tendencia", "pendientes"] as const;
export type Factor = (typeof FACTORES)[number];

export const PESOS_RIESGO: Record<Factor, number> = {
  rendimiento: 0.45,
  asistencia: 0.25,
  tendencia: 0.15,
  pendientes: 0.15,
};
export const UMBRAL_MEDIO = 0.35;
export const UMBRAL_ALTO = 0.6;

export type Nivel = "Alto" | "Medio" | "Bajo";

export const NOMBRE_FACTOR: Record<Factor, string> = {
  rendimiento: "Rendimiento",
  asistencia: "Asistencia",
  tendencia: "Notas en caída",
  pendientes: "Evaluaciones sin rendir",
};

export interface Riesgo {
  codigo: string;
  factores: Record<Factor, number>;
  indice: number;
  nivel: Nivel;
  principal: Factor | null;
  recomendacion: string;
}

const clip = (x: number) => Math.min(1, Math.max(0, x));

export function factores(e: Estudiante, evaluaciones: string[], asistenciaDisponible: boolean): Record<Factor, number> {
  const vals = evaluaciones.map((ev) => e.notas[ev]).filter((n): n is number => n != null);
  const promedio = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN;
  const rendimiento = vals.length ? clip((NOTA_APROBATORIA + 2 - promedio) / 6) : 1;
  const asistencia = !asistenciaDisponible ? 0 : e.asistencia == null ? 0.5 : clip((0.9 - e.asistencia) / 0.2);
  const tendencia = vals.length < 2 ? 0 : clip((vals[0] - vals[vals.length - 1]) / 6);
  const pendientes = 1 - vals.length / evaluaciones.length;
  return { rendimiento, asistencia, tendencia, pendientes };
}

export function recomendar(nivel: Nivel, factor: Factor | null): string {
  if (nivel === "Bajo") return "Seguimiento regular.";
  const acciones: Record<Factor, string> = {
    rendimiento: "Tutoría académica y retroalimentación de las evaluaciones.",
    asistencia: "Contactar al estudiante o su familia por las inasistencias.",
    tendencia: "Conversar sobre la caída reciente de notas.",
    pendientes: "Programar evaluaciones de rezagados.",
  };
  const base = factor ? acciones[factor] : "Revisar el caso.";
  return (nivel === "Alto" ? "Prioritario: " : "") + base;
}

export function nivelDe(indice: number): Nivel {
  // Mismos cortes que pandas.cut(..., [-0.01, 0.35, 0.60, 1.01]): intervalos cerrados a la derecha.
  if (indice <= UMBRAL_MEDIO) return "Bajo";
  if (indice <= UMBRAL_ALTO) return "Medio";
  return "Alto";
}

/** Índice de riesgo por estudiante, ordenado de mayor a menor. */
export function indiceRiesgo(
  estudiantes: Estudiante[],
  evaluaciones: string[],
  pesos: Record<Factor, number> = PESOS_RIESGO,
): Riesgo[] {
  if (evaluaciones.length === 0) return [];
  const w = validarPesos(pesos as Pesos) as Record<Factor, number>;
  const hayAsistencia = estudiantes.some((e) => e.asistencia != null);
  const filas = estudiantes.map((e) => {
    const f = factores(e, evaluaciones, hayAsistencia);
    let indice = 0;
    let principal: Factor | null = null;
    let max = -1;
    for (const k of FACTORES) {
      const aporte = f[k] * w[k];
      indice += aporte;
      if (aporte > max) {
        max = aporte;
        principal = k;
      }
    }
    indice = round(indice, 3);
    if (indice <= 0) principal = null;
    const nivel = nivelDe(indice);
    return { codigo: e.codigo, factores: f, indice, nivel, principal, recomendacion: recomendar(nivel, principal) };
  });
  return filas.sort((a, b) => b.indice - a.indice);
}
