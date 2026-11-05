import { useEffect, useState, type ReactNode } from "react";
import { EstadoProvider, useEstado } from "./state";
import * as I from "./iconos";
import { exportarExcel } from "./lib/exportar";
import PantallaResumen from "./pantallas/Resumen";
import PantallaEstudiantes from "./pantallas/Estudiantes";
import PantallaRiesgo from "./pantallas/Riesgo";
import PantallaExamen from "./pantallas/Examen";
import PantallaDatos from "./pantallas/Datos";

export type Ruta = "resumen" | "estudiantes" | "riesgo" | "examen" | "datos";

const RUTAS: { id: Ruta; nombre: string; icono: (p: object) => ReactNode }[] = [
  { id: "resumen", nombre: "Resumen del curso", icono: I.Resumen },
  { id: "estudiantes", nombre: "Estudiantes", icono: I.Estudiantes },
  { id: "riesgo", nombre: "Alerta temprana", icono: I.Alerta },
  { id: "examen", nombre: "Análisis de examen", icono: I.Examen },
  { id: "datos", nombre: "Notas y pesos", icono: I.Datos },
];

function leerRuta(): { ruta: Ruta; param: string | null } {
  const [r, param] = window.location.hash.replace(/^#\/?/, "").split("/");
  const ruta = (RUTAS.find((x) => x.id === r)?.id ?? "resumen") as Ruta;
  return { ruta, param: param ? decodeURIComponent(param) : null };
}

export function ir(ruta: Ruta, param?: string) {
  window.location.hash = `/${ruta}${param ? `/${encodeURIComponent(param)}` : ""}`;
}

function Shell() {
  const e = useEstado();
  const [{ ruta, param }, setRuta] = useState(leerRuta);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const f = () => {
      setRuta(leerRuta());
      setMenu(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);

  useEffect(() => {
    const nombre = RUTAS.find((r) => r.id === ruta)?.nombre;
    document.title = `${nombre} · ${e.curso.nombre} · YachaQ`;
  }, [ruta, e.curso.nombre]);

  const altos = e.riesgo.filter((r) => r.nivel === "Alto").length;

  return (
    <div className="shell">
      <aside className={`sidebar${menu ? " open" : ""}`} aria-label="Navegación">
        <a className="brand" href="#/resumen" aria-label="YachaQ, ir al resumen del curso">
          <img src="/marca/yachaq-360.webp" srcSet="/marca/yachaq-360.webp 360w, /marca/yachaq-720.webp 720w" sizes="168px" width={168} height={75} alt="YachaQ" />
        </a>
        <nav className="nav">
          {RUTAS.slice(0, 4).map((r) => (
            <a key={r.id} href={`#/${r.id}`} aria-current={ruta === r.id ? "page" : undefined}>
              {r.icono({})}
              {r.nombre}
              {r.id === "riesgo" && altos > 0 && (
                <span className="count" aria-label={`${altos} en riesgo alto`}>
                  {altos}
                </span>
              )}
            </a>
          ))}
          <div className="nav-group">Configuración</div>
          <a href="#/datos" aria-current={ruta === "datos" ? "page" : undefined}>
            <I.Datos />
            Notas y pesos
          </a>
        </nav>
        <p className="sidebar-foot">
          Todo se calcula en este navegador. Las notas no se envían a ningún servidor.
        </p>
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}

      <header className="topbar">
        <button className="btn menu-btn" onClick={() => setMenu(true)} aria-label="Abrir menú">
          <I.Menu />
        </button>
        <a className="brand-sm" href="#/resumen" aria-label="YachaQ">
          <I.Marca />
        </a>
        <div className="scope">
          <strong>{e.curso.nombre}</strong>
          <span className="muted hide-sm">{e.curso.periodo}</span>
          {e.curso.ejemplo && <span className="pill warn hide-sm">Datos de ejemplo</span>}
        </div>
        <div className="right">
          <button className="btn" onClick={() => exportarExcel(e)} disabled={!e.resultados.length}>
            <I.Descargar />
            <span className="hide-sm">Exportar Excel</span>
          </button>
        </div>
      </header>

      <main className="sheet">
        {ruta === "resumen" && <PantallaResumen />}
        {ruta === "estudiantes" && <PantallaEstudiantes elegido={param} />}
        {ruta === "riesgo" && <PantallaRiesgo />}
        {ruta === "examen" && <PantallaExamen />}
        {ruta === "datos" && <PantallaDatos />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <EstadoProvider>
      <Shell />
    </EstadoProvider>
  );
}
