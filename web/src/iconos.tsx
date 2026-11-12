// Íconos de trazo (16 px, 1,5 de grosor), un solo juego.
import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const Resumen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M2 13.5h12M4 11V7M8 11V3M12 11V8" /></svg>
);
export const Estudiantes = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="6" cy="5.5" r="2.5" /><path d="M1.5 13.5c.6-2.3 2.3-3.5 4.5-3.5s3.9 1.2 4.5 3.5M11 3.2a2.4 2.4 0 0 1 0 4.6M12.5 10.3c1 .5 1.7 1.6 2 3.2" /></svg>
);
export const Alerta = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 2.2 14.3 13H1.7L8 2.2Z" /><path d="M8 6.5v3M8 11.4v.1" /></svg>
);
export const Examen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="1.8" width="10" height="12.4" rx="1.5" /><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" /></svg>
);
export const Datos = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 10V2.5M5 5.5l3-3 3 3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" /></svg>
);
export const Descargar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 2.5V10M5 7l3 3 3-3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" /></svg>
);
export const Buscar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
);
export const Menu = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>
);
export const Cerrar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m4 4 8 8M12 4l-8 8" /></svg>
);

export const Chevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m4 6 4 4 4-4" /></svg>
);
export const FlechaIzq = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10 3.5 5.5 8 10 12.5" /></svg>
);
export const FlechaDer = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 3.5 10.5 8 6 12.5" /></svg>
);
export const Sube = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 11l3.5-3.5 2.5 2.5L13 5.5M10 5.5h3v3" /></svg>
);
export const Baja = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 5l3.5 3.5L9 6l4 4M10 10.5h3v-3" /></svg>
);
export const Ordenar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 3v10M3 11l2 2 2-2M11 13V3M9 5l2-2 2 2" /></svg>
);
export const Reiniciar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3" /></svg>
);
export const Asistencia = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M5.5 2v3M10.5 2v3M5.5 9l2 2 3-3.5" /></svg>
);

/** Marca pequeña de YachaQ: el sol tras el nevado, en los colores del logo. */
export const Marca = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#0d2f6e" />
    <path d="M8.5 17a7.5 7.5 0 0 1 15 0" fill="#f5a800" />
    <path d="M3 25 12 13l3.5 4 4-5.5L29 25Z" fill="#1d5fc4" />
    <path d="m12 13-2.6 3.5 2.6-1 1.8 1.6L15.5 17Zm7.5-1.5-2.1 2.9 2.1-.8 1.5 1.3 1.3-.4Z" fill="#fff" />
  </svg>
);
