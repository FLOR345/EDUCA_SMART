// Gráficos en SVG propio: una pregunta por gráfico, un solo tono en los datos.
import { useEffect, useId, useRef, useState } from "react";

/** Ancho real del contenedor, para que el texto del gráfico quede a 12 px en cualquier pantalla. */
export function useAncho(inicial: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}
import { NOTA_APROBATORIA, type Resultado } from "./lib/grading";
import type { Distractor, Item } from "./lib/items";
import { nombreCompleto } from "./lib/datos";

const fmt1 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt2 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * La escala vigesimal: cada estudiante es un punto apilado sobre su nota final (0-20).
 * La línea del 11 separa a quienes aprueban; los que están debajo van como anillos rojos.
 */
export function EscalaVigesimal({
  resultados,
  onElegir,
}: {
  resultados: Resultado[];
  onElegir?: (codigo: string) => void;
}) {
  const [hover, setHover] = useState<{ r: Resultado; x: number; y: number } | null>(null);
  const titulo = useId();
  const [ref, W] = useAncho(760);
  const angosto = W < 560;
  const ml = 8;
  const mr = 8;
  const columnas = Array.from({ length: 21 }, (_, n) =>
    resultados.filter((r) => r.notaFinal === n).sort((a, b) => a.promedio - b.promedio),
  );
  const maxCol = Math.max(1, ...columnas.map((c) => c.length));
  const paso = (W - ml - mr) / 21;
  const radio = Math.max(3, Math.min(7, paso / 2 - 2));
  const pitch = radio * 2 + 3;
  const top = 34;
  const alto = Math.max(150, maxCol * pitch + 8);
  const base = top + alto;
  const H = base + 34;
  const cx = (n: number) => ml + paso * n + paso / 2;
  const xLinea = ml + paso * NOTA_APROBATORIA;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titulo}>
        <title id={titulo}>
          Distribución de notas finales: {resultados.filter((r) => r.aprobado).length} aprobados y{" "}
          {resultados.filter((r) => !r.aprobado).length} desaprobados de {resultados.length}.
        </title>
        {/* zona desaprobatoria */}
        <rect x={ml} y={top} width={xLinea - ml} height={alto} fill="var(--negative)" opacity={0.045} />
        <line x1={xLinea} x2={xLinea} y1={top - 8} y2={base} stroke="var(--text)" strokeDasharray="4 3" />
        <text x={xLinea + 6} y={top - 12} className="ink" style={{ fontWeight: 500 }}>
          Aprueba con 11
        </text>
        <text x={xLinea - 6} y={top - 12} textAnchor="end">
          Desaprobados
        </text>
        <line x1={ml} x2={W - mr} y1={base} y2={base} stroke="var(--text)" strokeWidth={1.5} />
        {columnas.map((col, n) =>
          col.map((r, i) => {
            const x = cx(n);
            const y = base - radio - 3 - i * pitch;
            const ok = r.aprobado;
            return (
              <circle
                key={r.codigo}
                cx={x}
                cy={y}
                r={radio}
                fill={ok ? "var(--accent)" : "var(--surface)"}
                stroke={ok ? "none" : "var(--negative)"}
                strokeWidth={ok ? 0 : 2}
                style={{ cursor: onElegir ? "pointer" : "default" }}
                tabIndex={onElegir ? 0 : -1}
                aria-label={`${nombreCompleto(r)}: ${r.notaFinal}`}
                onMouseEnter={() => setHover({ r, x, y })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ r, x, y })}
                onBlur={() => setHover(null)}
                onClick={() => onElegir?.(r.codigo)}
                onKeyDown={(e) => e.key === "Enter" && onElegir?.(r.codigo)}
              />
            );
          }),
        )}
        {Array.from({ length: 21 }, (_, n) => n).map((n) => (
          <text
            key={n}
            x={cx(n)}
            y={base + 18}
            textAnchor="middle"
            className={n === NOTA_APROBATORIA ? "ink" : undefined}
            style={{ fontVariantNumeric: "tabular-nums", fontWeight: n === NOTA_APROBATORIA ? 600 : 400 }}
          >
            {n === NOTA_APROBATORIA || (angosto ? n % 5 === 0 && n !== 10 : n % 2 === 0) ? n : ""}
          </text>
        ))}
      </svg>
      {hover && (
        <div
          role="status"
          style={{
            position: "absolute",
            left: `${(hover.x / W) * 100}%`,
            top: `${(hover.y / H) * 100}%`,
            translate: "-50% calc(-100% - 12px)",
            background: "var(--primary)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            lineHeight: "16px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 6px 16px rgba(0,0,0,.18)",
          }}
        >
          {nombreCompleto(hover.r)} · <b>{hover.r.notaFinal}</b> ({fmt2(hover.r.promedio)})
        </div>
      )}
    </div>
  );
}

/** Mapa de preguntas: dificultad (x) contra discriminación (y). */
export function MapaPreguntas({
  items,
  elegida,
  onElegir,
}: {
  items: Item[];
  elegida: string | null;
  onElegir: (p: string) => void;
}) {
  const titulo = useId();
  const [ref, W] = useAncho(560);
  const H = 300;
  const m = { l: 40, r: 12, t: 16, b: 36 };
  const minD = Math.min(0, ...items.map((i) => i.discriminacion));
  const yMin = Math.floor((minD - 0.1) * 5) / 5; // sólo baja hasta donde hay datos
  const yMax = 1;
  const x = (p: number) => m.l + p * (W - m.l - m.r);
  const y = (d: number) => m.t + ((yMax - d) / (yMax - yMin)) * (H - m.t - m.b);
  const ticksY = [yMin, ...[0, 0.5, 1]].filter((t, i, a) => a.indexOf(t) === i && (t >= yMin));
  const ticksX = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div ref={ref}>
    <svg className="chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titulo}>
      <title id={titulo}>Dificultad y discriminación de cada pregunta</title>
      {ticksY.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--text)" : "var(--grid)"} strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={m.l - 8} y={y(t) + 4} textAnchor="end">
            {t.toLocaleString("es-PE")}
          </text>
        </g>
      ))}
      <line x1={m.l} x2={W - m.r} y1={y(0.2)} y2={y(0.2)} stroke="var(--negative)" strokeDasharray="4 3" />
      <text x={m.l + 4} y={y(0.2) + 16} style={{ fill: "var(--negative)" }}>
        Mínimo aceptable 0.20
      </text>
      {ticksX.map((t) => (
        <text key={t} x={x(t)} y={H - m.b + 18} textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"}>
          {Math.round(t * 100)} %
        </text>
      ))}
      <text x={(W + m.l) / 2} y={H - 4} textAnchor="middle">
        Aciertos (dificultad)
      </text>
      {items.map((it) => {
        const malo = it.calidad === "clave" || it.calidad === "descartar";
        const sel = it.pregunta === elegida;
        return (
          <g
            key={it.pregunta}
            role="button"
            tabIndex={0}
            aria-label={`${it.pregunta}: ${it.diagnostico}`}
            style={{ cursor: "pointer" }}
            onClick={() => onElegir(it.pregunta)}
            onKeyDown={(e) => e.key === "Enter" && onElegir(it.pregunta)}
          >
            <title>{`${it.pregunta}: ${Math.round(it.dificultad * 100)} % de aciertos, discriminación ${it.discriminacion.toFixed(2)}`}</title>
            <circle
              cx={x(it.dificultad)}
              cy={y(it.discriminacion)}
              r={sel ? 7 : 5}
              fill={malo ? "var(--surface)" : "var(--accent)"}
              stroke={malo ? "var(--negative)" : sel ? "var(--text)" : "none"}
              strokeWidth={2}
            />
            {(sel || malo) && (
              <text
                x={x(it.dificultad)}
                y={y(it.discriminacion) - 12}
                textAnchor={it.dificultad > 0.93 ? "end" : it.dificultad < 0.07 ? "start" : "middle"}
                className="ink"
                style={{ fontWeight: sel ? 600 : 500, paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 4, strokeLinejoin: "round" }}
              >
                {it.pregunta}
              </text>
            )}
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/** Opciones elegidas en una pregunta: la correcta en el tono de los datos. */
export function BarrasOpciones({ datos }: { datos: Distractor[] }) {
  const max = Math.max(...datos.map((d) => d.proporcion), 0.01);
  return (
    <ul className="list" aria-label="Opciones elegidas">
      {datos.map((d) => (
        <li key={d.opcion} style={{ minHeight: 40 }}>
          <span style={{ width: 72, flex: "none" }} className={d.correcta ? "name" : "muted"}>
            {d.opcion}
            {d.correcta && <span className="sub">correcta</span>}
          </span>
          <span className="grow">
            <span className="bar-track" style={{ display: "block", background: "transparent" }}>
              <span
                className="bar-fill"
                style={{
                  display: "block",
                  width: `${(d.proporcion / max) * 88}%`,
                  background: d.correcta ? "var(--accent)" : "#bcc6d3",
                }}
              />
            </span>
          </span>
          <span className="figure num" style={{ width: 52 }}>
            {fmt1(d.proporcion * 100)} %
          </span>
        </li>
      ))}
    </ul>
  );
}
