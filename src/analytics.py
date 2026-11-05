"""Estadísticas del curso a partir de las calificaciones finales."""
from __future__ import annotations

import pandas as pd

from .grading import NOTA_APROBATORIA

RANGOS = [(-0.1, 10, "En inicio (0-10)"), (10, 13, "En proceso (11-13)"),
          (13, 17, "Logro esperado (14-17)"), (17, 20, "Logro destacado (18-20)")]


def resumen(finales: pd.DataFrame) -> dict:
    n = finales["nota_final"]
    if n.empty:
        return {"estudiantes": 0}
    return {
        "estudiantes": int(len(n)),
        "promedio": round(float(finales["promedio"].mean()), 2),
        "mediana": float(n.median()),
        "desviacion": round(float(finales["promedio"].std(ddof=1)), 2) if len(n) > 1 else 0.0,
        "maxima": int(n.max()),
        "minima": int(n.min()),
        "aprobados": int((n >= NOTA_APROBATORIA).sum()),
        "tasa_aprobacion": round(100 * float((n >= NOTA_APROBATORIA).mean()), 1),
    }


def niveles_logro(finales: pd.DataFrame) -> pd.DataFrame:
    n = finales["nota_final"]
    filas = []
    for lo, hi, etiqueta in RANGOS:
        c = int(((n > lo) & (n <= hi)).sum())
        filas.append({"nivel": etiqueta, "estudiantes": c,
                      "porcentaje": round(100 * c / len(n), 1) if len(n) else 0.0})
    return pd.DataFrame(filas)


def por_evaluacion(finales: pd.DataFrame, evaluaciones: list[str]) -> pd.DataFrame:
    filas = []
    for e in evaluaciones:
        v = pd.to_numeric(finales[e], errors="coerce")
        filas.append({"evaluacion": e, "promedio": round(float(v.mean()), 2),
                      "minima": float(v.min()), "maxima": float(v.max()),
                      "aprobados_%": round(100 * float((v >= NOTA_APROBATORIA).mean()), 1),
                      "no_rendida": int(v.isna().sum())})
    return pd.DataFrame(filas)


def por_grupo(finales: pd.DataFrame, columna: str) -> pd.DataFrame:
    """Compara secciones, turnos u otro grupo categórico."""
    g = finales.groupby(columna, dropna=False)
    return pd.DataFrame({
        "estudiantes": g["nota_final"].size(),
        "promedio": g["promedio"].mean().round(2),
        "tasa_aprobacion_%": (g["nota_final"].apply(
            lambda s: (s >= NOTA_APROBATORIA).mean()) * 100).round(1),
    }).reset_index()
