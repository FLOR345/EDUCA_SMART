import { useState, type ReactNode } from "react";
import { useEstado } from "../state";
import { aClave, columnasEvaluacion, leerArchivo, validarNotas, type Fila } from "../lib/datos";
import { f1 } from "../lib/formato";
import * as I from "../iconos";

function Zona({ titulo, ayuda, onArchivo, id }: { titulo: string; ayuda: ReactNode; onArchivo: (f: File) => void; id: string }) {
  const [sobre, setSobre] = useState(false);
  return (
    <label
      htmlFor={id}
      className={`dropzone${sobre ? " over" : ""}`}
      onDragOver={(x) => { x.preventDefault(); setSobre(true); }}
      onDragLeave={() => setSobre(false)}
      onDrop={(x) => {
        x.preventDefault();
        setSobre(false);
        const f = x.dataTransfer.files[0];
        if (f) onArchivo(f);
      }}
      style={{ cursor: "pointer" }}
    >
      <I.Datos />
      <span style={{ flex: 1 }}>
        <span className="name">{titulo}</span>
        <span className="sub">{ayuda}</span>
      </span>
      <span className="btn">Elegir archivo</span>
      <input id={id} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(x) => { const f = x.target.files?.[0]; if (f) onArchivo(f); x.target.value = ""; }} />
    </label>
  );
}

export default function PantallaDatos() {
  const e = useEstado();
  const [error, setError] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<{ filas: Fila[]; nombre: string } | null>(null);

  const disponibles = columnasEvaluacion(e.filas);
  const errores = validarNotas(e.filas, e.evaluaciones);
  const total = Object.values(e.pesos).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const cuadra = Math.abs(total - 100) < 0.05;

  const cargarNotas = async (f: File) => {
    setError(null);
    try {
      const filas = await leerArchivo(f);
      if (!filas.length) throw new Error("el archivo no tiene filas");
      if (!columnasEvaluacion(filas).length) throw new Error("no se encontró ninguna columna con notas de 0 a 20");
      e.importarNotas(filas, f.name);
    } catch (x) {
      setError(`No se pudo leer ${f.name}: ${(x as Error).message}.`);
    }
  };

  const cargarRespuestas = async (f: File) => {
    setError(null);
    try {
      const filas = await leerArchivo(f);
      setRespuestas({ filas, nombre: f.name });
      e.importarExamen(filas, {}, f.name.replace(/\.[^.]+$/, ""));
    } catch (x) {
      setError(`No se pudo leer ${f.name}: ${(x as Error).message}.`);
    }
  };

  const cargarClave = async (f: File) => {
    setError(null);
    try {
      const clave = aClave(await leerArchivo(f));
      const base = respuestas ?? (e.examen ? { filas: e.examen.filas, nombre: e.examen.nombre } : null);
      if (!base) throw new Error("primero cargue las respuestas");
      e.importarExamen(base.filas, clave, base.nombre);
    } catch (x) {
      setError(`No se pudo leer ${f.name}: ${(x as Error).message}.`);
    }
  };

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Notas y pesos</h1>
          <p className="lead">
            {e.filas.length ? <>{e.filas.length} estudiantes y {e.evaluaciones.length} evaluaciones cargadas{e.curso.ejemplo ? " (datos ficticios de ejemplo)" : ""}.</> : "Aún no hay notas cargadas."}
          </p>
        </div>
        <div className="actions">
          {!e.curso.ejemplo && <button className="btn" onClick={e.restaurarEjemplo}>Usar datos de ejemplo</button>}
          <button className="btn danger" onClick={() => { if (confirm("¿Borrar las notas y el examen guardados en este navegador?")) e.borrarTodo(); }}>
            Borrar todo
          </button>
        </div>
      </div>

      {error && <div className="errors" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="row-2">
        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Curso</h2></div>
            <div className="card-body row-2" style={{ gap: 16 }}>
              <div className="field">
                <label htmlFor="curso">Nombre</label>
                <input id="curso" className="input" value={e.curso.nombre} onChange={(x) => e.setCurso({ nombre: x.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="periodo">Periodo</label>
                <input id="periodo" className="input" value={e.curso.periodo} onChange={(x) => e.setCurso({ periodo: x.target.value })} />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2>Archivo de notas</h2></div>
            <div className="card-body">
              <Zona
                id="f-notas"
                titulo="Notas del curso"
                ayuda="CSV o Excel: una fila por estudiante y una columna por evaluación (0 a 20)."
                onArchivo={cargarNotas}
              />
              <p className="small muted" style={{ marginTop: 12 }}>
                Columnas reconocidas: <span className="mono">codigo</span>, <span className="mono">apellidos</span>, <span className="mono">nombres</span>,{" "}
                <span className="mono">seccion</span> y <span className="mono">asistencia</span> (en %), todas opcionales salvo las notas.
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2>Examen para analizar</h2></div>
            <div className="card-body stack" style={{ gap: 12 }}>
              <Zona id="f-resp" titulo="Respuestas" ayuda="Una fila por estudiante y una columna por pregunta (A, B, C… o 0/1)." onArchivo={cargarRespuestas} />
              <Zona id="f-clave" titulo="Clave (opcional)" ayuda="Dos columnas: pregunta y clave." onArchivo={cargarClave} />
              {e.examen && (
                <p className="small muted">
                  Cargado: {e.examen.nombre}, {e.examen.filas.length} estudiantes
                  {Object.keys(e.examen.clave).length ? `, clave de ${Object.keys(e.examen.clave).length} preguntas` : ", sin clave"}.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="card">
          <div className="card-head">
            <h2>Sistema de evaluación</h2>
            <span className="meta num" style={{ color: cuadra ? "var(--positive)" : "var(--warning)" }}>
              Suma {f1(total)} %{cuadra ? "" : " · se normaliza a 100 %"}
            </span>
          </div>
          <div className="card-body">
            {disponibles.length ? (
              <>
                <p className="muted" style={{ marginBottom: 10 }}>Evaluaciones que componen la nota final</p>
                <div className="chips" role="group" aria-label="Evaluaciones" style={{ marginBottom: 16 }}>
                  {disponibles.map((ev) => {
                    const on = e.evaluaciones.includes(ev);
                    return (
                      <button
                        key={ev}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        onClick={() => e.setEvaluaciones(on ? e.evaluaciones.filter((x) => x !== ev) : disponibles.filter((x) => x === ev || e.evaluaciones.includes(x)))}
                      >
                        {ev}
                      </button>
                    );
                  })}
                </div>
                <table>
                  <thead>
                    <tr><th>Evaluación</th><th className="num">Peso (%)</th></tr>
                  </thead>
                  <tbody>
                    {e.evaluaciones.map((ev) => (
                      <tr key={ev}>
                        <td className="name">{ev}</td>
                        <td className="num">
                          <label className="sr-only" htmlFor={`peso-${ev}`}>Peso de {ev}</label>
                          <input
                            id={`peso-${ev}`}
                            className="input sm num"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={e.pesos[ev] ?? 0}
                            onChange={(x) => e.setPesos({ ...e.pesos, [ev]: Number(x.target.value) })}
                            style={{ width: 96, textAlign: "right" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {e.errorPesos && <p className="errors" style={{ marginTop: 12 }}>{e.errorPesos}</p>}
                {errores.length > 0 && (
                  <div className="errors" style={{ marginTop: 12 }}>
                    Hay {errores.length} notas que corregir en el archivo:
                    <ul>
                      {errores.slice(0, 8).map((x) => (
                        <li key={`${x.fila}-${x.columna}`}>Fila {x.fila}, {x.columna}: {x.mensaje}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="small muted" style={{ marginTop: 12 }}>
                  Nota final = promedio ponderado redondeado (10.5 → 11). Se aprueba con 11. Una evaluación sin nota cuenta como 0.
                </p>
              </>
            ) : (
              <div className="empty">Cargue un archivo de notas para elegir las evaluaciones y sus pesos.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
