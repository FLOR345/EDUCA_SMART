// Calificaciones en escala vigesimal (0-20). Misma lógica que src/grading.py.
// Convención peruana: la nota final se redondea con 0,5 hacia arriba y se aprueba con 11.

export const NOTA_MIN = 0;
export const NOTA_MAX = 20;
export const NOTA_APROBATORIA = 11;

export type Nota = number | null;

export interface Estudiante {
  codigo: string;
  apellidos: string;
  nombres: string;
  seccion: string | null;
  asistencia: number | null; // proporción 0-1
  notas: Record<string, Nota>;
}

export interface Resultado extends Estudiante {
  promedio: number; // ponderado, 2 decimales
  notaFinal: number; // redondeada
  aprobado: boolean;
  pendientes: number; // evaluaciones sin nota
}

export type Pesos = Record<string, number>;

/** Redondeo vigesimal: 10,5 -> 11 (no el redondeo bancario). */
export function redondear(nota: number): number {
  if (!Number.isFinite(nota)) throw new Error("nota vacía");
  return Math.floor(nota + 0.5);
}

/** Redondeo a `dec` decimales igual que numpy/pandas: mitades al par sobre x·10^dec. */
export function round(x: number, dec: number): number {
  const f = 10 ** dec;
  return roundHalfEven(x * f) / f;
}

/** round() de Python sobre enteros: las mitades exactas van al número par (16,5 -> 16). */
export function roundHalfEven(y: number): number {
  const r = Math.round(y);
  return Math.abs(y % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** Comprueba que los pesos sean positivos y los normaliza para que sumen 1. */
export function validarPesos(pesos: Pesos): Pesos {
  const entradas = Object.entries(pesos);
  if (entradas.length === 0) throw new Error("Defina al menos una evaluación con su peso.");
  if (entradas.some(([, p]) => !(p > 0))) throw new Error("Todos los pesos deben ser mayores que 0.");
  const total = entradas.reduce((s, [, p]) => s + p, 0);
  return Object.fromEntries(entradas.map(([k, p]) => [k, p / total]));
}

/**
 * Promedio ponderado, nota final y condición.
 * Una evaluación sin nota cuenta como 0 y se informa en `pendientes`.
 */
export function calcularFinales(estudiantes: Estudiante[], pesos: Pesos): Resultado[] {
  const w = validarPesos(pesos);
  return estudiantes.map((e) => {
    let suma = 0;
    let pendientes = 0;
    for (const [ev, peso] of Object.entries(w)) {
      const n = e.notas[ev];
      if (n == null) pendientes++;
      else suma += n * peso;
    }
    const notaFinal = redondear(suma);
    return {
      ...e,
      promedio: round(suma, 2),
      notaFinal,
      aprobado: notaFinal >= NOTA_APROBATORIA,
      pendientes,
    };
  });
}

/**
 * Nota mínima que necesita en la evaluación restante para aprobar.
 * null si ni con 20 alcanza; 0 si ya está aprobado.
 */
export function notaNecesaria(actuales: Record<string, Nota>, pesos: Pesos, restante: string): number | null {
  const w = validarPesos(pesos);
  let acumulado = 0;
  for (const [ev, peso] of Object.entries(w)) {
    if (ev !== restante) acumulado += (actuales[ev] ?? 0) * peso;
  }
  const requerida = (NOTA_APROBATORIA - 0.5 - acumulado) / w[restante];
  if (requerida <= 0) return 0;
  if (requerida > NOTA_MAX) return null;
  return Math.ceil(round(requerida * 10, 9)) / 10;
}
