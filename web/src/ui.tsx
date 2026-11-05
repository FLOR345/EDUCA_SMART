import type { ReactNode } from "react";
import { iniciales, tinte } from "./lib/formato";
import type { Nivel } from "./lib/risk";

export function Avatar({ codigo, apellidos, nombres, size = 32 }: { codigo: string; apellidos: string; nombres: string; size?: number }) {
  return (
    <span className="avatar" style={{ background: tinte(codigo), width: size, height: size, fontSize: size > 36 ? 15 : 12 }} aria-hidden="true">
      {iniciales(apellidos, nombres, codigo)}
    </span>
  );
}

export function Condicion({ aprobado }: { aprobado: boolean }) {
  return <span className={`pill ${aprobado ? "ok" : "bad"}`}>{aprobado ? "Aprobado" : "Desaprobado"}</span>;
}

export function PillNivel({ nivel }: { nivel: Nivel }) {
  const c = nivel === "Alto" ? "bad" : nivel === "Medio" ? "warn" : "neutral";
  return <span className={`pill ${c}`}>Riesgo {nivel.toLowerCase()}</span>;
}

export function Seg<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { id: T; nombre: ReactNode }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div className="seg" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.id} type="button" aria-pressed={valor === o.id} onClick={() => onCambio(o.id)}>
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

export function SinDatos() {
  return (
    <div className="empty">
      Todavía no hay notas cargadas. <a href="#/datos">Cargue un archivo de notas</a> para ver esta sección.
    </div>
  );
}
