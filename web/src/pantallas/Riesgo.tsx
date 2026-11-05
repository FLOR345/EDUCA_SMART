import { useState } from "react";
import { useEstado } from "../state";
import { nombreCompleto } from "../lib/datos";
import { f2, pct } from "../lib/formato";
import { FACTORES, NOMBRE_FACTOR, PESOS_RIESGO, UMBRAL_ALTO, UMBRAL_MEDIO } from "../lib/risk";
import { Avatar, PillNivel, Seg, SinDatos } from "../ui";

const ACCION = {
  rendimiento: "Tutoría y retroalimentación",
  asistencia: "Contactar al estudiante o su familia",
  tendencia: "Conversar sobre la caída de notas",
  pendientes: "Programar evaluación de rezagados",
} as const;

const EXPLICA = {
  rendimiento: "Promedio de lo rendido: 13 o más no suma riesgo; 7 o menos, el máximo.",
  asistencia: "90 % o más no suma; 70 % o menos, el máximo.",
  tendencia: "Caída entre la primera y la última nota rendida (6 puntos = máximo).",
  pendientes: "Proporción de evaluaciones que aún no rinde.",
} as const;

export default function PantallaRiesgo() {
  const e = useEstado();
  const [ver, setVer] = useState<"atencion" | "todos">("atencion");

  if (!e.resultados.length) {
    return (
      <>
        <div className="title-row"><div><h1>Alerta temprana</h1></div></div>
        <SinDatos />
      </>
    );
  }

  const n = { Alto: 0, Medio: 0, Bajo: 0 };
  for (const r of e.riesgo) n[r.nivel]++;
  const filas = ver === "atencion" ? e.riesgo.filter((r) => r.nivel !== "Bajo") : e.riesgo;
  const totalPeso = Object.values(e.pesosRiesgo).reduce((a, b) => a + b, 0) || 1;
  const toggle = (ev: string) =>
    e.setRendidas(e.rendidas.includes(ev) ? e.rendidas.filter((x) => x !== ev) : [...e.rendidas, ev]);

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Alerta temprana</h1>
          <p className="lead">
            {e.rendidas.length ? (
              <>
                <b>{n.Alto} en riesgo alto</b> y {n.Medio} en riesgo medio, con {e.rendidas.length === 1 ? "la evaluación" : `las ${e.rendidas.length} evaluaciones`} rendidas hasta hoy ({e.rendidas.join(", ")}).
              </>
            ) : (
              "Marque las evaluaciones ya rendidas para calcular el riesgo."
            )}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <span className="muted">Evaluaciones rendidas</span>
        <div className="chips" role="group" aria-label="Evaluaciones rendidas">
          {e.evaluaciones.map((ev) => (
            <button key={ev} type="button" className="chip" aria-pressed={e.rendidas.includes(ev)} onClick={() => toggle(ev)}>
              {ev}
            </button>
          ))}
        </div>
      </div>

      <div className="with-rail">
        <div className="stack">
          <div className="kpis" style={{ ["--n" as string]: 3 }}>
            <div className="kpi">
              <div className="label">Riesgo alto</div>
              <div className="value" style={{ color: n.Alto ? "var(--negative)" : undefined }}>{n.Alto}</div>
              <div className="note">Índice mayor que {f2(UMBRAL_ALTO)}</div>
            </div>
            <div className="kpi">
              <div className="label">Riesgo medio</div>
              <div className="value">{n.Medio}</div>
              <div className="note">Entre {f2(UMBRAL_MEDIO)} y {f2(UMBRAL_ALTO)}</div>
            </div>
            <div className="kpi">
              <div className="label">Riesgo bajo</div>
              <div className="value">{n.Bajo}</div>
              <div className="note">Seguimiento regular</div>
            </div>
          </div>

          <section className="card" aria-labelledby="t-riesgo">
            <div className="card-head">
              <h2 id="t-riesgo">A quién atender primero</h2>
              <div style={{ marginLeft: "auto" }}>
                <Seg
                  etiqueta="Mostrar"
                  valor={ver}
                  onCambio={setVer}
                  opciones={[
                    { id: "atencion", nombre: `Alto y medio ${n.Alto + n.Medio}` },
                    { id: "todos", nombre: `Todos ${e.riesgo.length}` },
                  ]}
                />
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Nivel</th>
                    <th className="num">Índice</th>
                    <th className="hide-phone">Factor principal y qué hacer</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((x) => {
                    const r = e.porCodigo.get(x.codigo)!;
                    return (
                      <tr key={x.codigo}>
                        <td>
                          <a href={`#/estudiantes/${encodeURIComponent(x.codigo)}`} style={{ textDecoration: "none", display: "flex", gap: 10, alignItems: "center" }}>
                            <Avatar {...r} />
                            <span className="two">
                              <span className="name">{nombreCompleto(r)}</span>
                              <span className="sub">
                                {r.asistencia != null ? `Asistencia ${pct(r.asistencia * 100)}` : r.codigo}
                              </span>
                            </span>
                          </a>
                        </td>
                        <td><PillNivel nivel={x.nivel} /></td>
                        <td className="num">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                            <span className="bar-track" style={{ width: 72, height: 4 }}>
                              <span className={`bar-fill${x.nivel === "Alto" ? " bad" : ""}`} style={{ display: "block", width: `${x.indice * 100}%`, background: x.nivel === "Bajo" ? "#bcc6d3" : undefined }} />
                            </span>
                            {f2(x.indice)}
                          </span>
                        </td>
                        <td className="hide-phone">
                          {x.principal ? (
                            <span className="two">
                              <span>{NOMBRE_FACTOR[x.principal]}</span>
                              <span className="sub">{x.nivel === "Bajo" ? "Seguimiento regular" : ACCION[x.principal]}</span>
                            </span>
                          ) : <span className="dash">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {!filas.length && (
                    <tr><td colSpan={4} className="muted">Ningún estudiante con riesgo alto o medio.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="rail">
          <section>
            <h2 className="rail-title">Cómo se calcula el índice</h2>
            <div className="card card-body" style={{ paddingTop: 16 }}>
              <p className="muted small" style={{ marginBottom: 12 }}>
                Suma ponderada de cuatro factores entre 0 y 1. Orienta la tutoría; la decisión es del docente.
              </p>
              {FACTORES.map((f) => (
                <div key={f} className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor={`p-${f}`} style={{ display: "flex" }}>
                    {NOMBRE_FACTOR[f]}
                    <span className="num muted" style={{ marginLeft: "auto", fontWeight: 400 }}>
                      {pct((100 * e.pesosRiesgo[f]) / totalPeso)}
                    </span>
                  </label>
                  <input
                    id={`p-${f}`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={e.pesosRiesgo[f]}
                    onChange={(x) => e.setPesosRiesgo({ ...e.pesosRiesgo, [f]: Number(x.target.value) })}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="small muted">{EXPLICA[f]}</span>
                </div>
              ))}
              <button className="btn" onClick={() => e.setPesosRiesgo({ ...PESOS_RIESGO })}>Restablecer pesos</button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
