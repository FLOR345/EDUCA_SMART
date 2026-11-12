import { useEffect, useMemo, useState } from "react";
import { useEstado } from "../state";
import { ir } from "../App";
import * as I from "../iconos";
import { nombreCompleto } from "../lib/datos";
import { NOTA_APROBATORIA, notaNecesaria, type Resultado } from "../lib/grading";
import { f1, f2, pct } from "../lib/formato";
import { NOMBRE_FACTOR } from "../lib/risk";
import { Avatar, Condicion, PillNivel, Seg, SinDatos } from "../ui";

type Filtro = "todos" | "aprobados" | "desaprobados" | "pendientes";
type Orden = { col: string; asc: boolean };

export default function PantallaEstudiantes({ elegido }: { elegido: string | null }) {
  const e = useEstado();
  const [filtro, setFiltro] = useState<Filtro>(() =>
    elegido?.startsWith("filtro:") ? (elegido.slice(7) as Filtro) : "todos",
  );
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<Orden>({ col: "nombre", asc: true });

  const sel = elegido ? e.porCodigo.get(elegido) ?? null : null;
  useEffect(() => {
    if (sel && window.innerWidth <= 1180) document.getElementById("detalle")?.scrollIntoView({ block: "start" });
  }, [sel]);

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase();
    let xs = e.resultados.filter((r) => {
      if (filtro === "aprobados" && !r.aprobado) return false;
      if (filtro === "desaprobados" && r.aprobado) return false;
      if (filtro === "pendientes" && r.pendientes === 0) return false;
      return !t || `${r.codigo} ${r.apellidos} ${r.nombres}`.toLowerCase().includes(t);
    });
    const val = (r: Resultado): string | number => {
      if (orden.col === "nombre") return nombreCompleto(r).toLowerCase();
      if (orden.col === "seccion") return r.seccion ?? "";
      if (orden.col === "asistencia") return r.asistencia ?? -1;
      if (orden.col === "promedio") return r.promedio;
      return r.notas[orden.col] ?? -1;
    };
    xs = [...xs].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const c = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb));
      return orden.asc ? c : -c;
    });
    return xs;
  }, [e.resultados, filtro, q, orden]);

  if (!e.resultados.length) {
    return (
      <>
        <div className="title-row"><div><h1>Estudiantes</h1></div></div>
        <SinDatos />
      </>
    );
  }

  const cuenta = {
    todos: e.resultados.length,
    aprobados: e.resultados.filter((r) => r.aprobado).length,
    desaprobados: e.resultados.filter((r) => !r.aprobado).length,
    pendientes: e.resultados.filter((r) => r.pendientes > 0).length,
  };
  const hayAsistencia = e.resultados.some((r) => r.asistencia != null);
  const haySeccion = e.resultados.some((r) => r.seccion);

  const Cab = ({ col, children, num }: { col: string; children: string; num?: boolean }) => (
    <th className={num ? "num" : undefined} aria-sort={orden.col === col ? (orden.asc ? "ascending" : "descending") : undefined}>
      <button onClick={() => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : !num }))}>
        {children}
        {orden.col === col && <span aria-hidden="true">{orden.asc ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Estudiantes</h1>
          <p className="lead">
            {cuenta.todos} matriculados · <b>{cuenta.desaprobados} desaprobados</b>
            {cuenta.pendientes > 0 && <> · {cuenta.pendientes} con evaluaciones sin rendir</>}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div className="search">
          <I.Buscar />
          <label className="sr-only" htmlFor="buscar">Buscar estudiante</label>
          <input id="buscar" className="input sm" placeholder="Buscar por nombre o código" value={q} onChange={(x) => setQ(x.target.value)} />
        </div>
        <Seg
          etiqueta="Filtrar estudiantes"
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { id: "todos", nombre: `Todos ${cuenta.todos}` },
            { id: "aprobados", nombre: `Aprobados ${cuenta.aprobados}` },
            { id: "desaprobados", nombre: `Desaprobados ${cuenta.desaprobados}` },
            ...(cuenta.pendientes ? [{ id: "pendientes" as Filtro, nombre: `Con pendientes ${cuenta.pendientes}` }] : []),
          ]}
        />
      </div>

      <div className={sel ? "with-rail" : "stack"}>
        <section className="card" aria-label="Lista de estudiantes">
          <div className="table-wrap scroll">
            <table>
              <thead>
                <tr>
                  <Cab col="nombre">Estudiante</Cab>
                  {haySeccion && <Cab col="seccion">Sección</Cab>}
                  {hayAsistencia && <Cab col="asistencia" num>Asistencia</Cab>}
                  {e.evaluaciones.map((ev) => (
                    <Cab key={ev} col={ev} num>{ev}</Cab>
                  ))}
                  <Cab col="promedio" num>Final</Cab>
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr
                    key={r.codigo}
                    className="clickable"
                    aria-selected={sel?.codigo === r.codigo}
                    onClick={() => ir("estudiantes", r.codigo)}
                  >
                    <td>
                      <a
                        href={`#/estudiantes/${encodeURIComponent(r.codigo)}`}
                        style={{ textDecoration: "none", display: "flex", gap: 10, alignItems: "center" }}
                        onClick={(x) => x.stopPropagation()}
                      >
                        <Avatar {...r} />
                        <span className="two">
                          <span className="name">{nombreCompleto(r)}</span>
                          <span className="sub mono">{r.codigo}</span>
                        </span>
                      </a>
                    </td>
                    {haySeccion && <td>{r.seccion ?? <span className="dash">—</span>}</td>}
                    {hayAsistencia && (
                      <td className="num" style={{ color: r.asistencia != null && r.asistencia < 0.7 ? "var(--negative)" : undefined }}>
                        {r.asistencia == null ? <span className="dash">—</span> : pct(r.asistencia * 100)}
                      </td>
                    )}
                    {e.evaluaciones.map((ev) => {
                      const n = r.notas[ev];
                      return (
                        <td key={ev} className="num" style={{ color: n != null && n < NOTA_APROBATORIA - 0.5 ? "var(--muted)" : undefined }}>
                          {n == null ? <span className="dash" title="No rendida">—</span> : f1(n)}
                        </td>
                      );
                    })}
                    <td className="num">
                      <span className="two">
                        <span style={{ fontWeight: 600, color: r.aprobado ? undefined : "var(--negative)" }} title={r.aprobado ? "Aprobado" : "Desaprobado"}>
                          {r.notaFinal}
                          <span className="sr-only">{r.aprobado ? " aprobado" : " desaprobado"}</span>
                        </span>
                        <span className="sub">{f2(r.promedio)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {!filas.length && (
                  <tr>
                    <td colSpan={99} className="muted" style={{ textAlign: "left" }}>Ningún estudiante coincide con la búsqueda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {sel && (
          <aside id="detalle" className="stack" aria-label="Detalle del estudiante">
            <Detalle r={sel} />
            <a className="btn" href="#/estudiantes" style={{ justifyContent: "center" }}>Cerrar detalle</a>
          </aside>
        )}
      </div>
    </>
  );
}

function Detalle({ r }: { r: Resultado }) {
  const e = useEstado();
  const riesgo = e.riesgo.find((x) => x.codigo === r.codigo);
  const pendientes = e.evaluaciones.filter((ev) => r.notas[ev] == null);
  const [restante, setRestante] = useState<string>(pendientes[0] ?? e.evaluaciones[e.evaluaciones.length - 1]);
  useEffect(() => {
    setRestante(pendientes[0] ?? e.evaluaciones[e.evaluaciones.length - 1]);
  }, [r.codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  const pesoTotal = Object.values(e.pesos).reduce((a, b) => a + b, 0);
  let necesaria: number | null | undefined;
  try {
    necesaria = notaNecesaria(r.notas, e.pesos, restante);
  } catch {
    necesaria = undefined;
  }

  return (
    <>
      <section className="card">
        <div className="card-body" style={{ paddingTop: 20, display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar {...r} size={44} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>{nombreCompleto(r)}</h2>
            <span className="sub mono">{r.codigo}{r.seccion ? ` · Sección ${r.seccion}` : ""}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 30, lineHeight: "34px" }}>{r.notaFinal}</div>
            <span className="sub">nota final</span>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Condicion aprobado={r.aprobado} />
          {riesgo && <PillNivel nivel={riesgo.nivel} />}
        </div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <dl className="kv">
            {e.evaluaciones.map((ev) => (
              <div key={ev}>
                <dt>{ev} <span className="muted small">· {pct((100 * e.pesos[ev]) / pesoTotal)}</span></dt>
                <dd>{r.notas[ev] == null ? <span className="dash">No rendida</span> : f1(r.notas[ev]!)}</dd>
              </div>
            ))}
            <div><dt style={{ fontWeight: 600 }}>Promedio ponderado</dt><dd style={{ fontWeight: 600 }}>{f2(r.promedio)}</dd></div>
            {r.asistencia != null && <div><dt>Asistencia</dt><dd>{pct(r.asistencia * 100)}</dd></div>}
          </dl>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>¿Cuánto necesita para aprobar?</h2></div>
        <div className="card-body">
          <div className="field">
            <label htmlFor="restante">Si le falta rendir</label>
            <select id="restante" className="input" value={restante} onChange={(x) => setRestante(x.target.value)}>
              {e.evaluaciones.map((ev) => (
                <option key={ev} value={ev}>{ev}{r.notas[ev] == null ? " (no rendida)" : ""}</option>
              ))}
            </select>
          </div>
          <p style={{ marginTop: 12, fontSize: 15, lineHeight: "22px" }}>
            {necesaria === undefined ? "—"
              : necesaria === null ? <>Aun con 20 en {restante} <b>no alcanza</b> la nota aprobatoria.</>
              : necesaria === 0 ? <>Con las demás notas <b>ya aprueba</b>, sin importar lo que saque en {restante}.</>
              : <>Necesita al menos <b className="num" style={{ fontSize: 18 }}>{f1(necesaria)}</b> en {restante} para terminar con 11.</>}
          </p>
          <p className="small muted" style={{ marginTop: 6 }}>Calculado con las otras notas tal como están y los pesos del curso.</p>
        </div>
      </section>

      {riesgo && riesgo.nivel !== "Bajo" && (
        <section className="card">
          <div className="card-head"><h2>Alerta temprana</h2><span className="meta num">Índice {f2(riesgo.indice)}</span></div>
          <div className="card-body">
            <p>{riesgo.recomendacion}</p>
            <p className="small muted" style={{ marginTop: 6 }}>Factor principal: {riesgo.principal ? NOMBRE_FACTOR[riesgo.principal] : "—"}</p>
          </div>
        </section>
      )}
    </>
  );
}
