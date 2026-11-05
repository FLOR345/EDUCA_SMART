// Exporta el curso a un libro de Excel, en el navegador.
import type * as XLSXTipos from "xlsx";
import type { Estado } from "../state";
import { nivelesLogro, porEvaluacion, resumen } from "./estadisticas";
import { NOMBRE_FACTOR } from "./risk";

type Lib = typeof XLSXTipos;

function hoja(XLSX: Lib, filas: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(filas);
  const cols = filas.length ? Object.keys(filas[0]) : [];
  ws["!cols"] = cols.map((c) => ({
    wch: Math.min(50, Math.max(c.length, ...filas.slice(0, 200).map((f) => String(f[c] ?? "").length)) + 2),
  }));
  return ws;
}

export async function exportarExcel(e: Estado) {
  const XLSX: Lib = await import("xlsx"); // se descarga sólo al exportar
  const wb = XLSX.utils.book_new();
  const r = resumen(e.resultados);
  if (r) {
    XLSX.utils.book_append_sheet(
      wb,
      hoja(XLSX, [
        { indicador: "Curso", valor: e.curso.nombre },
        { indicador: "Periodo", valor: e.curso.periodo },
        { indicador: "Estudiantes", valor: r.estudiantes },
        { indicador: "Promedio", valor: r.promedio },
        { indicador: "Mediana", valor: r.mediana },
        { indicador: "Desviación", valor: r.desviacion },
        { indicador: "Aprobados", valor: r.aprobados },
        { indicador: "Tasa de aprobación (%)", valor: r.tasaAprobacion },
      ]),
      "Resumen",
    );
  }
  XLSX.utils.book_append_sheet(
    wb,
    hoja(XLSX, 
      e.resultados.map((x) => ({
        codigo: x.codigo,
        apellidos: x.apellidos,
        nombres: x.nombres,
        seccion: x.seccion ?? "",
        asistencia_pct: x.asistencia == null ? "" : Math.round(x.asistencia * 1000) / 10,
        ...Object.fromEntries(e.evaluaciones.map((ev) => [ev, x.notas[ev] ?? ""])),
        promedio: x.promedio,
        nota_final: x.notaFinal,
        condicion: x.aprobado ? "Aprobado" : "Desaprobado",
        pendientes: x.pendientes,
      })),
    ),
    "Calificaciones",
  );
  XLSX.utils.book_append_sheet(wb, hoja(XLSX, porEvaluacion(e.resultados, e.evaluaciones)), "Por evaluacion");
  XLSX.utils.book_append_sheet(
    wb,
    hoja(XLSX, nivelesLogro(e.resultados).map((n) => ({ nivel: n.nombre, rango: n.rango, estudiantes: n.estudiantes, porcentaje: n.porcentaje }))),
    "Niveles de logro",
  );
  XLSX.utils.book_append_sheet(
    wb,
    hoja(XLSX, Object.entries(e.pesos).map(([evaluacion, peso]) => ({ evaluacion, peso_pct: peso }))),
    "Pesos",
  );
  if (e.riesgo.length) {
    XLSX.utils.book_append_sheet(
      wb,
      hoja(XLSX, 
        e.riesgo.map((x) => {
          const est = e.porCodigo.get(x.codigo);
          return {
            codigo: x.codigo,
            estudiante: est ? `${est.apellidos}, ${est.nombres}` : "",
            indice_riesgo: x.indice,
            nivel: x.nivel,
            factor_principal: x.principal ? NOMBRE_FACTOR[x.principal] : "-",
            recomendacion: x.recomendacion,
          };
        }),
      ),
      "Alerta temprana",
    );
  }
  if (e.examen && e.examen.items.length) {
    XLSX.utils.book_append_sheet(
      wb,
      hoja(XLSX, 
        e.examen.items.map((i) => ({
          pregunta: i.pregunta,
          dificultad: i.dificultad,
          discriminacion: i.discriminacion,
          r_pbis: i.rPbis ?? "",
          diagnostico: i.diagnostico,
        })),
      ),
      "Analisis de examen",
    );
  }
  const nombre = `YachaQ_${e.curso.nombre}_${e.curso.periodo}.xlsx`.replace(/\s+/g, "_");
  XLSX.writeFile(wb, nombre);
}
