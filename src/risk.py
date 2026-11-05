"""Alerta temprana de estudiantes en riesgo de desaprobar.

El índice es transparente a propósito: cada factor se puede explicar al
estudiante y a su familia. No reemplaza el criterio del docente.

Factores (0 = sin riesgo, 1 = riesgo máximo):
- rendimiento: qué tan lejos está el promedio parcial de la nota aprobatoria.
- asistencia: inasistencia por encima del 70 % de asistencia mínima.
- tendencia: caída entre la primera y la última evaluación rendida.
- pendientes: proporción de evaluaciones no rendidas.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .grading import NOTA_APROBATORIA, validar_pesos

PESOS_RIESGO = {"rendimiento": 0.45, "asistencia": 0.25,
                "tendencia": 0.15, "pendientes": 0.15}
UMBRAL_ALTO = 0.60
UMBRAL_MEDIO = 0.35


def _clip(x):
    return np.clip(x, 0.0, 1.0)


def factores(df: pd.DataFrame, evaluaciones: list[str],
             asistencia_col: str | None = "asistencia") -> pd.DataFrame:
    notas = df[evaluaciones].apply(pd.to_numeric, errors="coerce")
    rendidas = notas.notna().sum(axis=1)
    promedio = notas.mean(axis=1)

    # 20 o más -> 0; 7 o menos -> 1 (lineal entre ambos, centrado en 11).
    rend = _clip((NOTA_APROBATORIA + 2 - promedio) / 6).where(rendidas > 0, 1.0)

    if asistencia_col and asistencia_col in df.columns:
        asis = pd.to_numeric(df[asistencia_col], errors="coerce")
        if asis.max() > 1:          # aceptar porcentaje 0-100
            asis = asis / 100
        f_asis = _clip((0.90 - asis) / 0.20).fillna(0.5)
    else:
        f_asis = pd.Series(0.0, index=df.index)

    def caida(fila):
        v = fila.dropna()
        if len(v) < 2:
            return 0.0
        return float(_clip((v.iloc[0] - v.iloc[-1]) / 6))

    tend = notas.apply(caida, axis=1)
    pend = 1 - rendidas / len(evaluaciones)
    return pd.DataFrame({"rendimiento": rend, "asistencia": f_asis,
                         "tendencia": tend, "pendientes": pend}, index=df.index)


def indice_riesgo(df: pd.DataFrame, evaluaciones: list[str],
                  asistencia_col: str | None = "asistencia",
                  pesos: dict[str, float] | None = None) -> pd.DataFrame:
    """Devuelve el índice (0-1), el nivel y el factor principal por estudiante."""
    pesos_n = validar_pesos(pesos or PESOS_RIESGO)
    f = factores(df, evaluaciones, asistencia_col)
    aporte = f * pd.Series(pesos_n)
    indice = aporte.sum(axis=1).round(3)

    nivel = pd.cut(indice, [-0.01, UMBRAL_MEDIO, UMBRAL_ALTO, 1.01],
                   labels=["Bajo", "Medio", "Alto"]).astype(str)
    principal = aporte.idxmax(axis=1).where(indice > 0, "-")

    out = df.copy()
    out["indice_riesgo"] = indice
    out["nivel_riesgo"] = nivel
    out["factor_principal"] = principal
    out["recomendacion"] = [recomendar(n, p) for n, p in zip(nivel, principal)]
    return out.sort_values("indice_riesgo", ascending=False)


def recomendar(nivel: str, factor: str) -> str:
    if nivel == "Bajo":
        return "Seguimiento regular."
    acciones = {
        "rendimiento": "Tutoría académica y retroalimentación de las evaluaciones.",
        "asistencia": "Contactar al estudiante o su familia por las inasistencias.",
        "tendencia": "Conversar sobre la caída reciente de notas.",
        "pendientes": "Programar evaluaciones de rezagados.",
    }
    base = acciones.get(factor, "Revisar el caso.")
    return ("Prioritario: " if nivel == "Alto" else "") + base
