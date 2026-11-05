import { useMemo, useState } from "react";
import { useEstado } from "../state";
import { ir } from "../App";
import { EscalaVigesimal } from "../charts";
import { nivelesLogro, porEvaluacion, resumen } from "../lib/estadisticas";
import { NOTA_APROBATORIA } from "../lib/grading";
import { nombreCompleto } from "../lib/datos";
import { f0, f1, f2, nota, pct } from "../lib/formato";
import { NOMBRE_FACTOR } from "../lib/risk";
import { Avatar, PillNivel, Seg, SinDatos } from "../ui";

export default function PantallaResumen() {
  const e = useEstado();
  const secciones = useMemo(
    () => [...new Set(e.resultados.map((r) => r.seccion).filter((s): s is string => !!s))].sort(),
    [e.resultados],
  );
  const [seccion, setSeccion] = useState<string>("todas");
  const vista = seccion === "todas" ? e.resultados : e.resultados.filter((r) => r.seccion === seccion);
  const s = resumen(vista);

  if (!s) {
    return (
      <>
        <div className="title-row"><div><h1>Resumen del curso</h1></div></div>
        <SinDatos />
      </>
    );
  }

  const desaprobados = vista.filter((r) => !r.aprobado);
  const cerca = desaprobados.filter((r) => r.promedio >= NOTA_APROBATORIA - 1.5).sort((a, b) => b.promedio - a.promedio);
  const conPendientes = vista.filter((r) => r.pendientes > 0);
  const totalPendientes = conPendientes.reduce((a, r) => a + r.pendientes, 0);
  const codigosVista = new Set(vista.map((r) => r.codigo));
  const riesgoAlto = e.riesgo.filter((r) => r.nivel !== "Bajo" && codigosVista.has(r.codigo));
  const evals = porEvaluacion(vista, e.evaluaciones);
  const niveles = nivelesLogro(vista);
  const pesoTotal = Object.values(e.pesos).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Resumen del curso</h1>
          <p className="lead">
            <b>{s.aprobados} de {s.estudiantes}</b> estudiantes aprueban.{" "}
            {desaprobados.length > 0 ? (
              <>
                {desaprobados.length} están debajo de 11
                {cerca.length > 0 && <>, y <b>{cerca.length} a un punto o menos</b> de aprobar</>}.
              </>
            ) : (
              "Nadie está debajo de 11."
            )}
          </p>
        </div>
        <div className="actions">
          <a className="btn primary" href="#/riesgo">Ver alerta temprana</a>
        </div>
      </div>

      {secciones.length > 1 && (
        <div style={{ marginBottom: "var(--gap)" }}>
          <Seg
            etiqueta="Sección"
            valor={seccion}
            onCambio={setSeccion}
            opciones={[{ id: "todas", nombre: "Todas las secciones" }, ...secciones.map((x) => ({ id: x, nombre: `Sección ${x}` }))]}
          />
        </div>
      )}

      <div className="with-rail">
        <div className="stack">
          <div className="kpis" style={{ ["--n" as string]: 4 }}>
            <div className="kpi">
              <div className="label">Aprobados</div>
              <div className="value">{s.aprobados}<small>/ {s.estudiantes}</small></div>
              <div className="note">{pct(s.tasaAprobacion)} del curso aprueba</div>
            </div>
            <div className="kpi">
              <div className="label">Promedio ponderado</div>
              <div className="value">{f2(s.promedio)}<small>/ 20</small></div>
              <div className="note">Desviación estándar {f2(s.desviacion)}</div>
            </div>
            <div className="kpi">
              <div className="label">Mediana final</div>
              <div className="value">{f0(s.mediana)}</div>
              <div className="note">Mínima {s.minima} · máxima {s.maxima}</div>
            </div>
            <div className="kpi">
              <div className="label">Sin rendir</div>
              <div className="value">{totalPendientes}</div>
              <div className="note">
                {conPendientes.length ? `Evaluaciones de ${conPendientes.length} estudiantes; cuentan como 0` : "Todas rendidas"}
              </div>
            </div>
          </div>

          <section className="card" aria-labelledby="t-escala">
            <div className="card-head">
              <h2 id="t-escala">Notas finales en la escala vigesimal</h2>
              <div className="legend" style={{ marginLeft: "auto" }}>
                <span><i className="dot" style={{ background: "var(--accent)" }} />Aprobado ({s.aprobados})</span>
                <span><i className="dot" style={{ border: "2px solid var(--negative)", width: 9, height: 9 }} />Desaprobado ({desaprobados.length})</span>
              </div>
            </div>
            <p className="card-sub small">Cada punto es un estudiante, sobre su nota final redondeada.</p>
            <div className="card-body">
              <EscalaVigesimal resultados={vista} onElegir={(c) => ir("estudiantes", c)} />
            </div>
          </section>

          <section className="card" aria-labelledby="t-evals">
            <div className="card-head">
              <h2 id="t-evals">Por evaluación</h2>
              <a className="btn ghost" style={{ marginLeft: "auto" }} href="#/datos">Cambiar pesos</a>
            </div>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Evaluación</th>
                    <th className="num">Peso</th>
                    <th className="num">Promedio</th>
                    <th className="num hide-phone">Mínima</th>
                    <th className="num hide-phone">Máxima</th>
                    <th className="num">Aprobados</th>
                    <th className="num">Sin rendir</th>
                  </tr>
                </thead>
                <tbody>
                  {evals.map((ev) => (
                    <tr key={ev.evaluacion}>
                      <td className="name">{ev.evaluacion}</td>
                      <td className="num">{pct((100 * (e.pesos[ev.evaluacion] ?? 0)) / pesoTotal)}</td>
                      <td className="num">{nota(ev.promedio)}</td>
                      <td className="num hide-phone">{nota(ev.minima)}</td>
                      <td className="num hide-phone">{nota(ev.maxima)}</td>
                      <td className="num">{pct(ev.aprobados)}</td>
                      <td className="num">{ev.noRendida || <span className="dash">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="rail">
          <section>
            <h2 className="rail-title">Cerca de aprobar</h2>
            <div className="card" style={{ padding: "4px var(--card-pad)" }}>
              {cerca.length ? (
                <ul className="list">
                  {cerca.slice(0, 5).map((r) => (
                    <li key={r.codigo}>
                      <Avatar {...r} />
                      <a className="grow" href={`#/estudiantes/${encodeURIComponent(r.codigo)}`} style={{ textDecoration: "none" }}>
                        <span className="name">{nombreCompleto(r)}</span>
                        <span className="sub">Promedio {f2(r.promedio)}</span>
                      </a>
                      <span className="figure">
                        <span className="num" style={{ fontWeight: 600 }}>+{f2(NOTA_APROBATORIA - 0.5 - r.promedio)}</span>
                        <span className="sub">le falta</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ padding: "14px 0" }}>Nadie está a un punto o menos de aprobar.</p>
              )}
            </div>
            {desaprobados.length > 0 && (
              <a className="btn" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} href="#/estudiantes/filtro:desaprobados">
                Ver los {desaprobados.length} desaprobados
              </a>
            )}
          </section>

          <section style={{ marginTop: "var(--gap)" }}>
            <h2 className="rail-title">Riesgo alto y medio</h2>
            <div className="card" style={{ padding: "4px var(--card-pad)" }}>
              {riesgoAlto.length ? (
                <ul className="list">
                  {riesgoAlto.slice(0, 4).map((x) => {
                    const r = e.porCodigo.get(x.codigo)!;
                    return (
                      <li key={x.codigo}>
                        <a className="grow" href={`#/estudiantes/${encodeURIComponent(x.codigo)}`} style={{ textDecoration: "none" }}>
                          <span className="name">{nombreCompleto(r)}</span>
                          <span className="sub">{x.principal ? NOMBRE_FACTOR[x.principal] : "—"}</span>
                        </a>
                        <PillNivel nivel={x.nivel} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted" style={{ padding: "14px 0" }}>Ningún estudiante con riesgo alto o medio.</p>
              )}
            </div>
          </section>

          <section style={{ marginTop: "var(--gap)" }}>
            <h2 className="rail-title">Niveles de logro</h2>
            <div className="card" style={{ padding: "4px var(--card-pad)" }}>
              <ul className="list">
                {niveles.map((n) => (
                  <li key={n.nombre} style={{ minHeight: 44 }}>
                    <span className="grow">
                      <span className="name">{n.nombre}</span>
                      <span className="sub">{n.rango}</span>
                    </span>
                    <span className="figure">
                      <span className="num">{n.estudiantes}</span>
                      <span className="sub num">{f1(n.porcentaje)} %</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
