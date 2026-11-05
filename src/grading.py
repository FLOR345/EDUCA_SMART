"""Cálculo de calificaciones en escala vigesimal (0-20).

Convención peruana: la nota final se redondea al entero más cercano
(0,5 hacia arriba) y se aprueba con 11 o más.
"""
from __future__ import annotations

import math

import pandas as pd

NOTA_MIN = 0.0
NOTA_MAX = 20.0
NOTA_APROBATORIA = 11


def redondear(nota: float) -> int:
    """Redondeo vigesimal: 10,5 -> 11 (no el redondeo bancario de Python)."""
    if nota is None or (isinstance(nota, float) and math.isnan(nota)):
        raise ValueError("nota vacía")
    return int(math.floor(nota + 0.5))


def validar_pesos(pesos: dict[str, float]) -> dict[str, float]:
    """Comprueba que los pesos sean positivos y los normaliza para que sumen 1."""
    if not pesos:
        raise ValueError("Defina al menos una evaluación con su peso.")
    if any(p <= 0 for p in pesos.values()):
        raise ValueError("Todos los pesos deben ser mayores que 0.")
    total = sum(pesos.values())
    return {k: v / total for k, v in pesos.items()}


def validar_notas(df: pd.DataFrame, columnas: list[str]) -> list[str]:
    """Devuelve mensajes de error para notas fuera de 0-20 o no numéricas."""
    errores = []
    for col in columnas:
        if col not in df.columns:
            errores.append(f"Falta la columna de evaluación '{col}'.")
            continue
        valores = pd.to_numeric(df[col], errors="coerce")
        no_num = df[col].notna() & valores.isna()
        fuera = valores.notna() & ((valores < NOTA_MIN) | (valores > NOTA_MAX))
        for idx in df.index[no_num]:
            errores.append(f"Fila {idx + 2}, '{col}': '{df.at[idx, col]}' no es un número.")
        for idx in df.index[fuera]:
            errores.append(f"Fila {idx + 2}, '{col}': {valores[idx]} está fuera de 0-20.")
    return errores


def calcular_finales(df: pd.DataFrame, pesos: dict[str, float],
                     id_col: str = "codigo") -> pd.DataFrame:
    """Calcula promedio ponderado, nota final redondeada y condición.

    Una evaluación sin nota cuenta como 0 (no rendida) y se informa en
    la columna 'pendientes', para que el docente decida.
    """
    pesos_n = validar_pesos(pesos)
    cols = list(pesos_n)
    notas = df[cols].apply(pd.to_numeric, errors="coerce")
    pendientes = notas.isna().sum(axis=1)
    promedio = (notas.fillna(0) * pd.Series(pesos_n)).sum(axis=1)

    out = df[[c for c in df.columns if c not in cols]].copy()
    out[cols] = notas
    out["promedio"] = promedio.round(2)
    out["nota_final"] = promedio.apply(redondear)
    out["condicion"] = out["nota_final"].apply(
        lambda n: "Aprobado" if n >= NOTA_APROBATORIA else "Desaprobado")
    out["pendientes"] = pendientes
    if id_col in out.columns:
        out = out.set_index(id_col, drop=False)
    return out


def nota_necesaria(notas_actuales: dict[str, float], pesos: dict[str, float],
                   evaluacion_restante: str) -> float | None:
    """Nota mínima que se necesita en la evaluación restante para aprobar.

    Devuelve None si ni con 20 se alcanza, y 0 si ya está aprobado.
    """
    pesos_n = validar_pesos(pesos)
    acumulado = sum(notas_actuales.get(k, 0) * w for k, w in pesos_n.items()
                    if k != evaluacion_restante)
    w = pesos_n[evaluacion_restante]
    # Se necesita promedio >= 10,5 para que el redondeo dé 11.
    requerida = (NOTA_APROBATORIA - 0.5 - acumulado) / w
    if requerida <= 0:
        return 0.0
    if requerida > NOTA_MAX:
        return None
    return round(math.ceil(requerida * 10) / 10, 1)
