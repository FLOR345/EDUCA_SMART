import { useState } from "react";
import { useEstado } from "../state";
import { BarrasOpciones, MapaPreguntas } from "../charts";
import { distractores, type Item } from "../lib/items";
import { f1, f2, pct } from "../lib/formato";

const CALIDADES: { id: Item["calidad"]; nombre: string; criterio: string }[] = [
  { id: "excelente", nombre: "Excelente", criterio: "D ≥ 0.40" },
  { id: "buena", nombre: "Buena", criterio: "0.30 a 0.39" },
  { id: "mejorar", nombre: "Mejorar", criterio: "0.20 a 0.29" },
  { id: "descartar", nombre: "Descartar o reformular", criterio: "D < 0.20" },
  { id: "clave", nombre: "Revisar la clave", criterio: "discrimina al revés" },
];

export default function PantallaExamen() {
  const e = useEstado();
  const ex = e.examen;
  const [elegida, setElegida] = useState<string | null>(null);

  if (!ex) {
    return (
      <>
        <div className="title-row"><div><h1>Análisis de examen</h1></div></div>
        <div className="empty">No hay un examen cargado. <a href="#/datos">Cargue las respuestas y la clave</a> para analizar cada pregunta.</div>
      </>
    );
  }
  if (ex.error) {
    return (
      <>
        <div className="title-row"><div><h1>Análisis de examen</h1></div></div>
        <div className="errors">No se pudo analizar el examen: {ex.error} <a href="#/datos">Revisar archivos</a></div>
      </>
    );
  }

  const problemas = ex.items.filter((i) => i.calidad === "clave" || i.calidad === "descartar");
  const sel = ex.items.find((i) => i.pregunta === (elegida ?? problemas[0]?.pregunta ?? ex.items[0]?.pregunta));
  const media = ex.puntajes.reduce((a, b) => a + b, 0) / (ex.puntajes.length || 1);
  const confiable = ex.kr20 >= 0.7;
  const tieneClave = Object.keys(ex.clave).length > 0;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Análisis de examen</h1>
          <p className="lead">
            {ex.nombre}: {ex.preguntas.length} preguntas, {ex.respuestas.length} estudiantes.{" "}
            {problemas.length ? (
              <><b>{problemas.length} preguntas</b> no distinguen a quienes dominan el tema: {problemas.map((p) => p.pregunta).join(", ")}.</>
            ) : (
              "Todas las preguntas discriminan lo suficiente."
            )}
          </p>
        </div>
      </div>

      <div className="stack">
        <section className="card" aria-labelledby="t-calidad">
          <div className="card-head"><h2 id="t-calidad">Calidad del examen</h2></div>
          <div className="card-body exam-split" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: "var(--gap)", alignItems: "start" }}>
            <div>
              <div className="num" style={{ fontSize: 28, lineHeight: "36px" }}>{f2(ex.kr20)}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                <span className="muted">Confiabilidad KR-20</span>
                <span className={`pill ${confiable ? "ok" : "warn"}`}>{confiable ? "Aceptable" : "Baja, menor que 0.70"}</span>
              </div>
              <p className="small muted" style={{ marginTop: 6 }}>Nota promedio del examen: {f1(media)} de 20.</p>
              <ul className="list" style={{ marginTop: 14 }} aria-label="Preguntas por calidad">
                {CALIDADES.map((c) => {
                  const k = ex.items.filter((i) => i.calidad === c.id).length;
                  const malo = c.id === "clave" || c.id === "descartar";
                  return (
                    <li key={c.id} style={{ minHeight: 44 }}>
                      <i className="dot" style={malo ? { border: "2px solid var(--negative)", width: 9, height: 9 } : { background: "var(--accent)" }} />
                      <span className="grow">
                        <span className="name">{c.nombre}</span>
                        <span className="sub">{c.criterio}</span>
                      </span>
                      <span className="figure num" style={{ fontWeight: k && malo ? 600 : 400 }}>{k}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <MapaPreguntas items={ex.items} elegida={sel?.pregunta ?? null} onElegir={setElegida} />
            </div>
          </div>
        </section>

        <div className="with-rail">
          <section className="card" aria-labelledby="t-preguntas">
            <div className="card-head"><h2 id="t-preguntas">Preguntas</h2><span className="meta">Discriminación: 27 % superior menos 27 % inferior</span></div>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Pregunta</th>
                    <th className="num">Aciertos</th>
                    <th className="num">Discriminación</th>
                    <th className="num hide-phone">Punto-biserial</th>
                    <th>Diagnóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.items.map((i) => {
                    const malo = i.calidad === "clave" || i.calidad === "descartar";
                    return (
                      <tr key={i.pregunta} className="clickable" aria-selected={sel?.pregunta === i.pregunta} onClick={() => setElegida(i.pregunta)}>
                        <td className="name">
                          <button className="btn ghost" style={{ color: "var(--text)", padding: 0, height: "auto" }} onClick={(x) => { x.stopPropagation(); setElegida(i.pregunta); }}>
                            {i.pregunta}
                          </button>
                        </td>
                        <td className="num">{pct(i.dificultad * 100)}</td>
                        <td className="num" style={{ color: malo ? "var(--negative)" : undefined, fontWeight: malo ? 600 : 400 }}>{f2(i.discriminacion)}</td>
                        <td className="num hide-phone">{i.rPbis == null ? <span className="dash">—</span> : f2(i.rPbis)}</td>
                        <td>
                          <span className={`pill ${i.calidad === "clave" || i.calidad === "descartar" ? "bad" : i.calidad === "mejorar" ? "warn" : "neutral"}`}>
                            {i.diagnostico}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="stack">
            {sel && (
              <section className="card" aria-labelledby="t-sel">
                <div className="card-head">
                  <h2 id="t-sel">Pregunta {sel.pregunta}</h2>
                  {tieneClave && <span className="meta">Clave: <b style={{ color: "var(--text)" }}>{ex.clave[sel.pregunta]}</b></span>}
                </div>
                <div className="card-body">
                  <p style={{ marginBottom: 12 }}>{textoDiagnostico(sel)}</p>
                  {tieneClave ? (
                    <BarrasOpciones datos={distractores(ex.respuestas, sel.pregunta, ex.clave[sel.pregunta])} />
                  ) : (
                    <p className="muted small">Cargue la clave para ver qué opción eligió cada estudiante.</p>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

function textoDiagnostico(i: Item): string {
  const ac = `La acierta el ${f1(i.dificultad * 100)} %.`;
  switch (i.calidad) {
    case "clave":
      return `${ac} La aciertan más quienes peor rinden en el resto del examen: revise si la clave está bien.`;
    case "descartar":
      return `${ac} Casi no distingue a quienes dominan el tema; conviene reformularla o descartarla.`;
    case "mejorar":
      return `${ac} Distingue poco; revise los distractores que casi nadie elige.`;
    default:
      return `${ac} Distingue bien a quienes dominan el tema.`;
  }
}
