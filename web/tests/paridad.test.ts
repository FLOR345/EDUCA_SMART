// Comprueba que la app web calcule exactamente lo mismo que la versión Python
// (src/*.py, con sus propias pruebas en tests/). La referencia se genera con
// `python scripts/exportar_referencia.py`.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { aClave, aEstudiantes, aRespuestas, leerCSV } from "../src/lib/datos";
import { calcularFinales, notaNecesaria } from "../src/lib/grading";
import { analizarItems, calificar, kr20 } from "../src/lib/items";
import { indiceRiesgo } from "../src/lib/risk";
import { resumen } from "../src/lib/estadisticas";

const raiz = resolve(__dirname, "../..");
const ref = JSON.parse(readFileSync(resolve(__dirname, "referencia_python.json"), "utf-8"));
const leer = (f: string) => leerCSV(readFileSync(resolve(raiz, "examples", f), "utf-8"));

const evals = Object.keys(ref.pesos);
const estudiantes = aEstudiantes(leer("notas_curso.csv"), evals);

describe("paridad con la versión Python", () => {
  it("calificaciones finales", () => {
    const r = calcularFinales(estudiantes, ref.pesos);
    expect(r).toHaveLength(Object.keys(ref.finales).length);
    for (const x of r) {
      const e = ref.finales[x.codigo];
      expect(x.promedio, x.codigo).toBeCloseTo(e.promedio, 6);
      expect(x.notaFinal, x.codigo).toBe(e.nota_final);
      expect(x.pendientes, x.codigo).toBe(e.pendientes);
    }
  });

  it("resumen del curso", () => {
    const s = resumen(calcularFinales(estudiantes, ref.pesos))!;
    expect(s.promedio).toBeCloseTo(ref.resumen.promedio, 6);
    expect(s.desviacion).toBeCloseTo(ref.resumen.desviacion, 6);
    expect(s.aprobados).toBe(ref.resumen.aprobados);
    expect(s.tasaAprobacion).toBeCloseTo(ref.resumen.tasa_aprobacion, 6);
    expect(s.mediana).toBe(ref.resumen.mediana);
  });

  it("índice de riesgo", () => {
    const r = indiceRiesgo(estudiantes, ref.rendidas);
    for (const x of r) {
      const e = ref.riesgo[x.codigo];
      expect(x.indice, x.codigo).toBeCloseTo(e.indice, 6);
      expect(x.nivel, x.codigo).toBe(e.nivel);
      expect(x.principal ?? "-", x.codigo).toBe(e.factor);
    }
  });

  it("análisis del examen", () => {
    const { respuestas } = aRespuestas(leer("examen_respuestas.csv"));
    const clave = aClave(leer("examen_clave.csv"));
    const m = calificar(respuestas, clave);
    expect(kr20(m)).toBeCloseTo(ref.kr20, 9);
    for (const it of analizarItems(m, Object.keys(clave))) {
      const e = ref.items[it.pregunta];
      expect(it.dificultad, it.pregunta).toBeCloseTo(e.dificultad, 6);
      expect(it.discriminacion, it.pregunta).toBeCloseTo(e.discriminacion, 6);
      if (e.r_pbis == null) expect(it.rPbis).toBeNull();
      else expect(it.rPbis!, it.pregunta).toBeCloseTo(e.r_pbis, 6);
      expect(it.diagnostico, it.pregunta).toBe(e.diagnostico);
    }
  });

  it("nota necesaria", () => {
    expect(notaNecesaria({ EP: 10 }, { EP: 50, EF: 50 }, "EF")).toBe(ref.nota_necesaria.a);
    expect(notaNecesaria({ PC1: 12, PC2: 9, EP: 10, TA: 13 }, ref.pesos, "EF")).toBe(ref.nota_necesaria.b);
  });
});
