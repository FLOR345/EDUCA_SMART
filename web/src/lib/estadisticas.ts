// Estadísticas del curso. Misma lógica que src/analytics.py.

import { NOTA_APROBATORIA, round, type Resultado } from "./grading";

export interface Resumen {
  estudiantes: number;
  promedio: number;
  mediana: number;
  desviacion: number;
  maxima: number;
  minima: number;
  aprobados: number;
  tasaAprobacion: number;
}

export function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function resumen(r: Resultado[]): Resumen | null {
  if (!r.length) return null;
  const prom = r.map((x) => x.promedio);
  const mu = prom.reduce((a, b) => a + b, 0) / prom.length;
  const sd = prom.length > 1 ? Math.sqrt(prom.reduce((s, x) => s + (x - mu) ** 2, 0) / (prom.length - 1)) : 0;
  const finales = r.map((x) => x.notaFinal);
  const aprobados = r.filter((x) => x.notaFinal >= NOTA_APROBATORIA).length;
  return {
    estudiantes: r.length,
    promedio: round(mu, 2),
    mediana: mediana(finales),
    desviacion: round(sd, 2),
    maxima: Math.max(...finales),
    minima: Math.min(...finales),
    aprobados,
    tasaAprobacion: round((100 * aprobados) / r.length, 1),
  };
}

export const NIVELES = [
  { min: 0, max: 10, nombre: "En inicio", rango: "0-10" },
  { min: 11, max: 13, nombre: "En proceso", rango: "11-13" },
  { min: 14, max: 17, nombre: "Logro esperado", rango: "14-17" },
  { min: 18, max: 20, nombre: "Logro destacado", rango: "18-20" },
] as const;

export function nivelesLogro(r: Resultado[]) {
  return NIVELES.map((n) => {
    const c = r.filter((x) => x.notaFinal >= n.min && x.notaFinal <= n.max).length;
    return { ...n, estudiantes: c, porcentaje: r.length ? round((100 * c) / r.length, 1) : 0 };
  });
}

export function porEvaluacion(r: Resultado[], evaluaciones: string[]) {
  return evaluaciones.map((ev) => {
    const v = r.map((x) => x.notas[ev]).filter((n): n is number => n != null);
    return {
      evaluacion: ev,
      promedio: v.length ? round(v.reduce((a, b) => a + b, 0) / v.length, 2) : null,
      minima: v.length ? Math.min(...v) : null,
      maxima: v.length ? Math.max(...v) : null,
      // Como en pandas: la proporción se calcula sobre todos (no rendida = no aprobó).
      aprobados: r.length ? round((100 * v.filter((n) => n >= NOTA_APROBATORIA).length) / r.length, 1) : 0,
      noRendida: r.length - v.length,
    };
  });
}

export function porGrupo(r: Resultado[]) {
  const grupos = new Map<string, Resultado[]>();
  for (const x of r) {
    const g = x.seccion ?? "Sin sección";
    grupos.set(g, [...(grupos.get(g) ?? []), x]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grupo, xs]) => ({
      grupo,
      estudiantes: xs.length,
      promedio: round(xs.reduce((s, x) => s + x.promedio, 0) / xs.length, 2),
      tasaAprobacion: round((100 * xs.filter((x) => x.aprobado).length) / xs.length, 1),
    }));
}

/** Histograma de notas finales enteras 0..20. */
export function distribucion(r: Resultado[]): number[] {
  const bins = Array.from({ length: 21 }, () => 0);
  for (const x of r) bins[Math.min(20, Math.max(0, x.notaFinal))]++;
  return bins;
}
