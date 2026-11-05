export const f0 = (n: number) => n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
export const f1 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const f2 = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (n: number) => `${f1(n)} %`;
export const nota = (n: number | null | undefined) => (n == null ? "—" : f1(n));

/** Tinte pálido y estable por estudiante (identidad, no dato). */
export function tinte(codigo: string): string {
  let h = 0;
  for (const c of codigo) h = (h * 31 + c.charCodeAt(0)) % 360;
  // Evita la franja violeta/índigo (230-290).
  const hue = h >= 230 && h <= 290 ? (h + 80) % 360 : h;
  return `hsl(${hue} 45% 90%)`;
}

export function iniciales(apellidos: string, nombres: string, codigo: string): string {
  const a = apellidos.trim()[0] ?? "";
  const n = nombres.trim()[0] ?? "";
  return (n + a).toUpperCase() || codigo.slice(-2);
}
