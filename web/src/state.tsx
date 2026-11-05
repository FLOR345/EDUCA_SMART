// Estado de la app: curso, notas, pesos y examen. Se guarda en el navegador (localStorage).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import notasEjemplo from "../../examples/notas_curso.csv?raw";
import respuestasEjemplo from "../../examples/examen_respuestas.csv?raw";
import claveEjemplo from "../../examples/examen_clave.csv?raw";
import { aClave, aEstudiantes, aRespuestas, columnasEvaluacion, leerCSV, type Fila } from "./lib/datos";
import { calcularFinales, validarPesos, type Pesos, type Resultado } from "./lib/grading";
import { analizarItems, calificar, kr20, type Clave, type Item, type Respuestas } from "./lib/items";
import { indiceRiesgo, PESOS_RIESGO, type Factor, type Riesgo } from "./lib/risk";

export interface Curso {
  nombre: string;
  periodo: string;
  ejemplo: boolean; // true mientras se usan los datos ficticios
}

interface Guardado {
  curso: Curso;
  filas: Fila[];
  evaluaciones: string[];
  pesos: Pesos; // en %, tal como los escribe el docente
  rendidas: string[];
  pesosRiesgo: Record<Factor, number>;
  examen: { filas: Fila[]; clave: Clave; nombre: string } | null;
}

const CLAVE_LS = "educa-smart:v1";

function ejemplo(): Guardado {
  const filas = leerCSV(notasEjemplo);
  return {
    curso: { nombre: "Estadística I", periodo: "2026-II", ejemplo: true },
    filas,
    evaluaciones: ["PC1", "PC2", "EP", "TA", "EF"],
    pesos: { PC1: 15, PC2: 15, EP: 25, TA: 15, EF: 30 },
    rendidas: ["PC1", "PC2", "EP", "TA"],
    pesosRiesgo: { ...PESOS_RIESGO },
    examen: { filas: leerCSV(respuestasEjemplo), clave: aClave(leerCSV(claveEjemplo)), nombre: "Examen parcial" },
  };
}

function cargar(): Guardado {
  try {
    const s = localStorage.getItem(CLAVE_LS);
    if (s) return JSON.parse(s) as Guardado;
  } catch {
    /* almacenamiento no disponible o dañado: se usa el ejemplo */
  }
  return ejemplo();
}

export interface ExamenCalculado {
  nombre: string;
  filas: Fila[];
  respuestas: Respuestas;
  clave: Clave;
  preguntas: string[];
  items: Item[];
  kr20: number;
  puntajes: number[]; // en escala 0-20
  error: string | null;
}

function useEstadoInterno() {
  const [g, setG] = useState<Guardado>(cargar);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_LS, JSON.stringify(g));
    } catch {
      /* sin espacio: la sesión sigue funcionando en memoria */
    }
  }, [g]);

  const estudiantes = useMemo(() => aEstudiantes(g.filas, g.evaluaciones), [g.filas, g.evaluaciones]);

  const { resultados, errorPesos } = useMemo(() => {
    try {
      validarPesos(g.pesos);
      return { resultados: calcularFinales(estudiantes, g.pesos), errorPesos: null as string | null };
    } catch (e) {
      return { resultados: [] as Resultado[], errorPesos: (e as Error).message };
    }
  }, [estudiantes, g.pesos]);

  const rendidas = useMemo(
    () => g.evaluaciones.filter((e) => g.rendidas.includes(e)), // en el orden del curso
    [g.evaluaciones, g.rendidas],
  );
  const riesgo = useMemo<Riesgo[]>(() => {
    try {
      return indiceRiesgo(estudiantes, rendidas, g.pesosRiesgo);
    } catch {
      return [];
    }
  }, [estudiantes, rendidas, g.pesosRiesgo]);

  const examen = useMemo<ExamenCalculado | null>(() => {
    if (!g.examen) return null;
    const { respuestas, preguntas: cols } = aRespuestas(g.examen.filas);
    const clave = g.examen.clave;
    const preguntas = Object.keys(clave).length ? Object.keys(clave) : cols;
    try {
      const m = Object.keys(clave).length
        ? calificar(respuestas, clave)
        : respuestas.map((f) => preguntas.map((p) => Number(f[p] ?? 0)));
      return {
        nombre: g.examen.nombre,
        filas: g.examen.filas,
        respuestas,
        clave,
        preguntas,
        items: analizarItems(m, preguntas),
        kr20: kr20(m),
        puntajes: m.map((f) => (20 * f.reduce((a, b) => a + b, 0)) / preguntas.length),
        error: null,
      };
    } catch (e) {
      return { nombre: g.examen.nombre, filas: g.examen.filas, respuestas, clave, preguntas, items: [], kr20: NaN, puntajes: [], error: (e as Error).message };
    }
  }, [g.examen]);

  const porCodigo = useMemo(() => new Map(resultados.map((r) => [r.codigo, r])), [resultados]);

  return {
    curso: g.curso,
    filas: g.filas,
    evaluaciones: g.evaluaciones,
    pesos: g.pesos,
    rendidas,
    pesosRiesgo: g.pesosRiesgo,
    estudiantes,
    resultados,
    porCodigo,
    errorPesos,
    riesgo,
    examen,
    setCurso: (c: Partial<Curso>) => setG((s) => ({ ...s, curso: { ...s.curso, ...c } })),
    setPesos: (pesos: Pesos) => setG((s) => ({ ...s, pesos })),
    setRendidas: (rendidas: string[]) => setG((s) => ({ ...s, rendidas })),
    setPesosRiesgo: (pesosRiesgo: Record<Factor, number>) => setG((s) => ({ ...s, pesosRiesgo })),
    importarNotas: (filas: Fila[], nombreArchivo: string) =>
      setG((s) => {
        const evaluaciones = columnasEvaluacion(filas);
        const parejo = evaluaciones.length ? Math.round((1000 / evaluaciones.length)) / 10 : 0;
        return {
          ...s,
          curso: { ...s.curso, ejemplo: false, nombre: s.curso.ejemplo ? nombreArchivo.replace(/\.[^.]+$/, "") : s.curso.nombre },
          filas,
          evaluaciones,
          pesos: Object.fromEntries(evaluaciones.map((e) => [e, parejo])),
          rendidas: evaluaciones,
        };
      }),
    setEvaluaciones: (evaluaciones: string[]) =>
      setG((s) => ({
        ...s,
        evaluaciones,
        pesos: Object.fromEntries(evaluaciones.map((e) => [e, s.pesos[e] ?? 10])),
      })),
    importarExamen: (filas: Fila[], clave: Clave, nombre: string) =>
      setG((s) => ({ ...s, examen: { filas, clave, nombre } })),
    restaurarEjemplo: () => setG(ejemplo()),
    borrarTodo: () =>
      setG({
        curso: { nombre: "Mi curso", periodo: "2026-II", ejemplo: false },
        filas: [],
        evaluaciones: [],
        pesos: {},
        rendidas: [],
        pesosRiesgo: { ...PESOS_RIESGO },
        examen: null,
      }),
  };
}

export type Estado = ReturnType<typeof useEstadoInterno>;
const Ctx = createContext<Estado | null>(null);

export function EstadoProvider({ children }: { children: ReactNode }) {
  const estado = useEstadoInterno();
  return <Ctx.Provider value={estado}>{children}</Ctx.Provider>;
}

export function useEstado(): Estado {
  const e = useContext(Ctx);
  if (!e) throw new Error("useEstado fuera de EstadoProvider");
  return e;
}
