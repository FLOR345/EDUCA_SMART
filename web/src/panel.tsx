// Componentes interactivos del Resumen: filtros, tarjetas con tendencia, dona, barras agrupadas,
// destacados, carrusel de estudiantes y medidores. Usan los colores de siempre de YachaQ.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as I from "./iconos";
import { Avatar, Seg } from "./ui";
import { useAncho } from "./charts";
import { NOTA_APROBATORIA, type Resultado } from "./lib/grading";
import { nivelesLogro, porEvaluacion } from "./lib/estadisticas";
import { nombreCompleto } from "./lib/datos";
import { f0, f1, f2, nota, pct } from "./lib/formato";

/* ---------- colores de los datos (todos salen de la paleta del logo) ---------- */
const C_INICIO = "var(--negative)";
const C_PROCESO = "var(--accent)";
const C_ESPERADO = "var(--brand-navy)";
const C_DESTACADO = "#8fb3e8"; // tinte del azul de las montañas
const C_GRUPOS = ["var(--accent)", "var(--brand-navy)", "#8fb3e8", "#4f86d6", "#bcc6d3"];

/* ---------- filtro desplegable ---------- */
export function Filtro<T extends string>({
  etiqueta,
  valor,
  onCambio,
  opciones,
}: {
  etiqueta: string;
  valor: T;
  onCambio: (v: T) => void;
  opciones: { id: T; nombre: string }[];
}) {
  return (
    <label className="select">
      <span className="sr-only">{etiqueta}</span>
      <select value={valor} onChange={(e) => onCambio(e.target.value as T)}>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
      <I.Chevron />
    </label>
  );
}

/* ---------- tarjeta con ícono ---------- */
export function KpiIcono({ icono, valor, etiqueta }: { icono: ReactNode; valor: ReactNode; etiqueta: string }) {
  return (
    <div className="kpi-icon card">
      <span className="kpi-ico">{icono}</span>
      <div>
        <div className="value num">{valor}</div>
        <div className="label">{etiqueta}</div>
      </div>
    </div>
  );
}

/* ---------- franja de tendencias ---------- */
export interface Tendencia {
  etiqueta: string;
  valor: string;
  delta: number | null; // diferencia contra la evaluación anterior
  unidad: string;
  detalle?: string;
}

export function Tendencias({ items }: { items: Tendencia[] }) {
  return (
    <div className="trends card" role="list" aria-label="Tendencias">
      {items.map((t) => {
        const tipo = t.delta == null || Math.abs(t.delta) < 0.005 ? "flat" : t.delta > 0 ? "up" : "down";
        return (
          <div className="trend" role="listitem" key={t.etiqueta}>
            <span className="trend-label">{t.etiqueta}</span>
            <b className="num">{t.valor}</b>
            {t.delta != null ? (
              <span className={`delta ${tipo}`} title="Cambio respecto de la evaluación anterior">
                {tipo === "down" ? <I.Baja /> : <I.Sube />}
                {t.delta > 0 ? "+" : ""}
                {f1(t.delta)} {t.unidad}
              </span>
            ) : (
              t.detalle && <span className="delta flat">{t.detalle}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- dona: estudiantes por nivel o por sección ---------- */
export function DonaEstudiantes({ resultados }: { resultados: Resultado[] }) {
  const [por, setPor] = useState<"nivel" | "seccion">("nivel");
  const [fijo, setFijo] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const segmentos = useMemo(() => {
    const total = resultados.length || 1;
    if (por === "nivel") {
      const col = [C_INICIO, C_PROCESO, C_ESPERADO, C_DESTACADO];
      return nivelesLogro(resultados).map((n, i) => ({
        id: n.nombre,
        nombre: n.nombre,
        sub: n.rango,
        n: n.estudiantes,
        p: (100 * n.estudiantes) / total,
        color: col[i],
      }));
    }
    const grupos = new Map<string, number>();
    for (const r of resultados) grupos.set(r.seccion ?? "Sin sección", (grupos.get(r.seccion ?? "Sin sección") ?? 0) + 1);
    return [...grupos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([g, n], i) => ({
        id: g,
        nombre: g === "Sin sección" ? g : `Sección ${g}`,
        sub: "",
        n,
        p: (100 * n) / total,
        color: C_GRUPOS[i % C_GRUPOS.length],
      }));
  }, [resultados, por]);

  useEffect(() => setFijo(null), [por]);

  const mayor = segmentos.reduce((a, b) => (b.n > a.n ? b : a), segmentos[0]);
  const activo = segmentos.find((s) => s.id === (sobre ?? fijo)) ?? mayor;
  const resaltado = sobre ?? fijo;

  const R = 68;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  const maxP = Math.max(1, ...segmentos.map((s) => s.p));

  return (
    <section className="card" aria-labelledby="t-dona">
      <div className="card-head">
        <h2 id="t-dona">Por {por === "nivel" ? "nivel de logro" : "sección"}</h2>
        <div style={{ marginLeft: "auto" }}>
          <Seg
            etiqueta="Agrupar por"
            valor={por}
            onCambio={setPor}
            opciones={[
              { id: "nivel", nombre: "Nivel" },
              { id: "seccion", nombre: "Sección" },
            ]}
          />
        </div>
      </div>
      <div className="card-body dona-body">
        <div className="dona">
          <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label={`${activo.nombre}: ${f1(activo.p)} % de los estudiantes`}>
            <circle cx="90" cy="90" r={R} fill="none" stroke="var(--rule)" strokeWidth="26" />
            {segmentos.map((s) => {
              const largo = (s.p / 100) * C;
              const trazo = Math.max(0, largo - (segmentos.filter((x) => x.n > 0).length > 1 ? 2 : 0));
              const desfase = -acumulado;
              acumulado += largo;
              if (s.n === 0) return null;
              return (
                <circle
                  key={s.id}
                  className="dona-seg"
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={resaltado === s.id ? 32 : 26}
                  strokeDasharray={`${trazo} ${C - trazo}`}
                  strokeDashoffset={desfase}
                  transform="rotate(-90 90 90)"
                  opacity={resaltado && resaltado !== s.id ? 0.35 : 1}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.nombre}: ${s.n} estudiantes`}
                  onMouseEnter={() => setSobre(s.id)}
                  onMouseLeave={() => setSobre(null)}
                  onFocus={() => setSobre(s.id)}
                  onBlur={() => setSobre(null)}
                  onClick={() => setFijo(fijo === s.id ? null : s.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFijo(fijo === s.id ? null : s.id)}
                />
              );
            })}
          </svg>
          <div className="dona-centro" aria-hidden="true">
            <b className="num">{f1(activo.p)} %</b>
            <span>{activo.nombre}</span>
          </div>
        </div>

        <ul className="dona-lista" aria-label="Detalle">
          {segmentos.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={fijo === s.id}
                className={resaltado && resaltado !== s.id ? "tenue" : undefined}
                onMouseEnter={() => setSobre(s.id)}
                onMouseLeave={() => setSobre(null)}
                onFocus={() => setSobre(s.id)}
                onBlur={() => setSobre(null)}
                onClick={() => setFijo(fijo === s.id ? null : s.id)}
              >
                <i className="dot" style={{ background: s.color }} />
                <span className="dl-name">
                  {s.nombre}
                  {s.sub && <span className="sub">{s.sub}</span>}
                </span>
                <span className="dl-bar" aria-hidden="true">
                  <span style={{ width: `${(s.p / maxP) * 100}%`, background: s.color }} />
                </span>
                <span className="dl-pct num">{f1(s.p)} %</span>
                <span className="dl-n num">{s.n}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- barras agrupadas: resultados por evaluación ---------- */
const CATEGORIAS = [
  { id: "bajo", nombre: "Desaprobado (< 11)", color: C_INICIO },
  { id: "medio", nombre: "En proceso (11 a 13)", color: C_PROCESO },
  { id: "alto", nombre: "Logro (14 o más)", color: C_ESPERADO },
] as const;

export function BarrasEvaluaciones({ resultados, evaluaciones }: { resultados: Resultado[]; evaluaciones: string[] }) {
  const [modo, setModo] = useState<"cantidad" | "porcentaje">("cantidad");
  const [hover, setHover] = useState<{ x: number; y: number; txt: string } | null>(null);
  const [ref, W] = useAncho(620);

  const grupos = useMemo(
    () =>
      evaluaciones.map((ev) => {
        const v = resultados.map((r) => r.notas[ev]).filter((n): n is number => n != null);
        const c = { bajo: 0, medio: 0, alto: 0 };
        for (const n of v) c[n < NOTA_APROBATORIA ? "bajo" : n < 14 ? "medio" : "alto"]++;
        return { ev, total: v.length, ...c };
      }),
    [resultados, evaluaciones],
  );

  const H = 250;
  const m = { l: 38, r: 8, t: 12, b: 32 };
  const valor = (g: (typeof grupos)[number], k: "bajo" | "medio" | "alto") =>
    modo === "cantidad" ? g[k] : g.total ? (100 * g[k]) / g.total : 0;
  const maxBruto = Math.max(1, ...grupos.flatMap((g) => CATEGORIAS.map((c) => valor(g, c.id))));
  const paso = modo === "cantidad" ? (maxBruto > 40 ? 20 : maxBruto > 20 ? 10 : 5) : 25;
  const techo = Math.ceil(maxBruto / paso) * paso;
  const ticks = Array.from({ length: techo / paso + 1 }, (_, i) => i * paso);
  const gw = (W - m.l - m.r) / Math.max(1, grupos.length);
  const bw = Math.max(8, Math.min(26, gw / 4));
  const y = (v: number) => m.t + (1 - v / techo) * (H - m.t - m.b);

  return (
    <section className="card" aria-labelledby="t-barras">
      <div className="card-head">
        <h2 id="t-barras">Notas por evaluación</h2>
        <div style={{ marginLeft: "auto" }}>
          <Seg
            etiqueta="Mostrar"
            valor={modo}
            onCambio={setModo}
            opciones={[
              { id: "cantidad", nombre: "Estudiantes" },
              { id: "porcentaje", nombre: "%" },
            ]}
          />
        </div>
      </div>
      <div className="card-body">
        <div className="legend" style={{ marginBottom: 8 }}>
          {CATEGORIAS.map((c) => (
            <span key={c.id}>
              <i className="dot" style={{ background: c.color }} />
              {c.nombre}
            </span>
          ))}
        </div>
        <div ref={ref} style={{ position: "relative" }}>
          <svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Estudiantes por rango de nota en cada evaluación">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--text)" : "var(--grid)"} strokeWidth={t === 0 ? 1.5 : 1} />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end">
                  {t}
                  {modo === "porcentaje" ? " %" : ""}
                </text>
              </g>
            ))}
            {grupos.map((g, gi) => {
              const x0 = m.l + gi * gw + gw / 2 - (bw * 3 + 4) / 2;
              return (
                <g key={g.ev}>
                  {CATEGORIAS.map((c, ci) => {
                    const v = valor(g, c.id);
                    const x = x0 + ci * (bw + 2);
                    const alto = Math.max(0, y(0) - y(v));
                    const txt = `${g.ev} · ${c.nombre}: ${g[c.id]} estudiantes (${f1(g.total ? (100 * g[c.id]) / g.total : 0)} %)`;
                    return (
                      <rect
                        key={c.id}
                        className="barra"
                        x={x}
                        y={y(v)}
                        width={bw}
                        height={alto}
                        rx={3}
                        fill={c.color}
                        tabIndex={0}
                        aria-label={txt}
                        onMouseEnter={() => setHover({ x: x + bw / 2, y: y(v), txt: `${f1(g.total ? (100 * g[c.id]) / g.total : 0)} % · ${g[c.id]}` })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ x: x + bw / 2, y: y(v), txt: `${f1(g.total ? (100 * g[c.id]) / g.total : 0)} % · ${g[c.id]}` })}
                        onBlur={() => setHover(null)}
                      />
                    );
                  })}
                  <text x={m.l + gi * gw + gw / 2} y={H - 10} textAnchor="middle" className="ink">
                    {g.ev}
                  </text>
                </g>
              );
            })}
          </svg>
          {hover && (
            <div
              role="status"
              className="burbuja"
              style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}
            >
              {hover.txt}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- estudiantes destacados ---------- */
function mejora(r: Resultado, rendidas: string[]): number | null {
  const v = rendidas.map((e) => r.notas[e]).filter((n): n is number => n != null);
  return v.length >= 2 ? v[v.length - 1] - v[0] : null;
}

export function Destacados({ resultados, rendidas }: { resultados: Resultado[]; rendidas: string[] }) {
  const tarjetas = useMemo(() => {
    if (!resultados.length) return [];
    const mejor = [...resultados].sort((a, b) => b.promedio - a.promedio)[0];
    const conAsis = resultados.filter((r) => r.asistencia != null);
    const asis = conAsis.length ? [...conAsis].sort((a, b) => b.asistencia! - a.asistencia! || b.promedio - a.promedio)[0] : null;
    const conMejora = resultados.map((r) => ({ r, d: mejora(r, rendidas) })).filter((x): x is { r: Resultado; d: number } => x.d != null);
    const sube = conMejora.length ? [...conMejora].sort((a, b) => b.d - a.d)[0] : null;
    const baja = conMejora.length ? [...conMejora].sort((a, b) => a.d - b.d)[0] : null;
    return [
      { id: "mejor", titulo: "Mejor promedio", r: mejor, grande: `${f2(mejor.promedio)}`, unidad: "/ 20" },
      asis && { id: "asis", titulo: "Mejor asistencia", r: asis, grande: pct(100 * (asis.asistencia ?? 0)), unidad: "" },
      sube && { id: "sube", titulo: "Más mejoró en notas", r: sube.r, grande: `${sube.d > 0 ? "+" : ""}${f1(sube.d)}`, unidad: "pts" },
      baja && baja.d < 0 && { id: "baja", titulo: "Más cayó en notas", r: baja.r, grande: f1(baja.d), unidad: "pts" },
    ].filter(Boolean) as { id: string; titulo: string; r: Resultado; grande: string; unidad: string }[];
  }, [resultados, rendidas]);

  if (!tarjetas.length) return null;
  return (
    <section>
      <h2 className="rail-title">Destacados del curso</h2>
      <div className="destacados">
        {tarjetas.map((t) => (
          <a key={t.id} className="destacado card" href={`#/estudiantes/${encodeURIComponent(t.r.codigo)}`}>
            <Avatar {...t.r} size={44} />
            <b className="num dest-valor">
              {t.grande}
              {t.unidad && <small> {t.unidad}</small>}
            </b>
            <span className="name dest-nombre">{nombreCompleto(t.r)}</span>
            <span className="dest-stats num">
              <span><b>{f1(t.r.promedio)}</b>Prom.</span>
              <span><b>{t.r.asistencia != null ? f0(100 * t.r.asistencia) : "—"}</b>Asis. %</span>
              <span><b>{t.r.notaFinal}</b>Final</span>
            </span>
            <span className="dest-titulo">{t.titulo}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ---------- carrusel de estudiantes ---------- */
export function CarruselEstudiantes({ resultados }: { resultados: Resultado[] }) {
  const [orden, setOrden] = useState<"apellidos" | "promedio" | "asistencia">("promedio");
  const pista = useRef<HTMLDivElement>(null);

  const lista = useMemo(() => {
    const v = [...resultados];
    if (orden === "apellidos") v.sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), "es"));
    else if (orden === "promedio") v.sort((a, b) => b.promedio - a.promedio);
    else v.sort((a, b) => (b.asistencia ?? -1) - (a.asistencia ?? -1));
    return v.slice(0, 24);
  }, [resultados, orden]);

  useEffect(() => {
    pista.current?.scrollTo({ left: 0 });
  }, [orden, resultados]);

  const mover = (dir: 1 | -1) => pista.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <section className="card" aria-labelledby="t-carrusel">
      <div className="card-head">
        <h2 id="t-carrusel">Detalle de estudiantes</h2>
        <div className="head-tools">
          <Filtro
            etiqueta="Ordenar por"
            valor={orden}
            onCambio={setOrden}
            opciones={[
              { id: "promedio", nombre: "Promedio" },
              { id: "asistencia", nombre: "Asistencia" },
              { id: "apellidos", nombre: "Apellidos" },
            ]}
          />
        </div>
      </div>
      <div className="carrusel-wrap">
        <button type="button" className="btn nav-arrow" aria-label="Anteriores" onClick={() => mover(-1)}>
          <I.FlechaIzq />
        </button>
        <div className="carrusel" ref={pista} tabIndex={0} aria-label="Estudiantes, desplazamiento horizontal">
          {lista.map((r) => (
            <a key={r.codigo} className="est-card" href={`#/estudiantes/${encodeURIComponent(r.codigo)}`}>
              <Avatar {...r} size={52} />
              <span className="name">{r.nombres || r.codigo}</span>
              <span className="sub">{r.apellidos}</span>
              <span className="est-stats num">
                <span><b>{f1(r.promedio)}</b>Prom.</span>
                <span><b>{r.asistencia != null ? f0(100 * r.asistencia) : "—"}</b>Asis.</span>
                <span className={r.aprobado ? "" : "mal"}><b>{r.notaFinal}</b>Final</span>
              </span>
            </a>
          ))}
        </div>
        <button type="button" className="btn nav-arrow" aria-label="Siguientes" onClick={() => mover(1)}>
          <I.FlechaDer />
        </button>
      </div>
    </section>
  );
}

/* ---------- medidores: promedio por evaluación ---------- */
function Anillo({ valor, color, seleccionado }: { valor: number | null; color: string; seleccionado: boolean }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const p = valor == null ? 0 : Math.min(1, valor / 20);
  return (
    <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden="true">
      <circle cx="42" cy="42" r={R} fill="none" stroke={seleccionado ? "#fff" : "var(--accent-pale)"} strokeWidth="9" />
      <circle
        cx="42"
        cy="42"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${listo ? p * C : 0} ${C}`}
        transform="rotate(-90 42 42)"
        style={{ transition: "stroke-dasharray 700ms var(--ease-out)" }}
      />
    </svg>
  );
}

export function Medidores({ resultados, evaluaciones }: { resultados: Resultado[]; evaluaciones: string[] }) {
  const [orden, setOrden] = useState<"curso" | "desc" | "asc">("curso");
  const [sel, setSel] = useState<string | null>(null);

  const datos = useMemo(() => porEvaluacion(resultados, evaluaciones), [resultados, evaluaciones]);
  const lista = useMemo(() => {
    const v = [...datos];
    if (orden === "desc") v.sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1));
    if (orden === "asc") v.sort((a, b) => (a.promedio ?? 99) - (b.promedio ?? 99));
    return v;
  }, [datos, orden]);
  const actual = datos.find((d) => d.evaluacion === sel) ?? null;
  const siguiente = { curso: "desc", desc: "asc", asc: "curso" } as const;
  const nombreOrden = { curso: "orden del curso", desc: "de mayor a menor", asc: "de menor a mayor" }[orden];

  return (
    <section className="card" aria-labelledby="t-medidores">
      <div className="card-head">
        <h2 id="t-medidores">Promedio por evaluación</h2>
        <div className="head-tools">
          <button type="button" className="btn icon" onClick={() => setOrden(siguiente[orden])} aria-label={`Ordenar: ${nombreOrden}`} title={`Orden: ${nombreOrden}`}>
            <I.Ordenar />
          </button>
          <button
            type="button"
            className="btn icon"
            onClick={() => {
              setOrden("curso");
              setSel(null);
            }}
            aria-label="Restablecer"
            title="Restablecer"
          >
            <I.Reiniciar />
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="medidores">
          {lista.map((d) => {
            const bajo = d.promedio != null && d.promedio < NOTA_APROBATORIA;
            const activo = sel === d.evaluacion;
            return (
              <button
                key={d.evaluacion}
                type="button"
                className={`medidor${activo ? " activo" : ""}`}
                aria-pressed={activo}
                onClick={() => setSel(activo ? null : d.evaluacion)}
              >
                <span className="anillo">
                  <Anillo valor={d.promedio} color={bajo ? "var(--negative)" : "var(--accent)"} seleccionado={activo} />
                  <span className="anillo-valor num">
                    <b>{nota(d.promedio)}</b>
                    <small>{d.evaluacion}</small>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="medidor-detalle small" role="status">
          {actual ? (
            <>
              <b>{actual.evaluacion}</b>: mínima {nota(actual.minima)} · máxima {nota(actual.maxima)} · aprueba el {pct(actual.aprobados)}
              {actual.noRendida > 0 && <> · {actual.noRendida} sin rendir</>}
            </>
          ) : (
            <span className="muted">Toque una evaluación para ver su detalle. Escala de 0 a 20.</span>
          )}
        </p>
      </div>
    </section>
  );
}
