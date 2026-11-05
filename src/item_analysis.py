"""Análisis psicométrico de exámenes (teoría clásica de los tests).

Entrada: una fila por estudiante y una columna por pregunta.
- Si se da una clave de respuestas, las respuestas (A, B, C...) se
  convierten a 1 (correcta) / 0 (incorrecta o en blanco).
- Si no, se esperan directamente valores 0/1.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def calificar(respuestas: pd.DataFrame, clave: dict[str, str]) -> pd.DataFrame:
    """Convierte respuestas de opción múltiple a 0/1 usando la clave."""
    faltan = [p for p in clave if p not in respuestas.columns]
    if faltan:
        raise ValueError(f"La clave menciona preguntas que no están en los datos: {faltan}")
    out = pd.DataFrame(index=respuestas.index)
    for preg, correcta in clave.items():
        r = respuestas[preg].astype("string").str.strip().str.upper()
        out[preg] = (r == str(correcta).strip().upper()).fillna(False).astype(int)
    return out


def _validar_binario(m: pd.DataFrame) -> pd.DataFrame:
    m = m.apply(pd.to_numeric, errors="coerce").fillna(0)
    if not m.isin([0, 1]).all().all():
        raise ValueError("Las puntuaciones por pregunta deben ser 0 o 1.")
    if m.shape[0] < 2 or m.shape[1] < 2:
        raise ValueError("Se necesitan al menos 2 estudiantes y 2 preguntas.")
    return m.astype(int)


def kr20(m: pd.DataFrame) -> float:
    """Confiabilidad KR-20 (equivale a alfa de Cronbach con ítems 0/1)."""
    m = _validar_binario(m)
    k = m.shape[1]
    p = m.mean()
    var_total = m.sum(axis=1).var(ddof=1)
    if var_total == 0:
        return float("nan")
    return float(k / (k - 1) * (1 - (p * (1 - p)).sum() / var_total))


def analizar_items(m: pd.DataFrame, grupo: float = 0.27) -> pd.DataFrame:
    """Dificultad, discriminación y correlación punto-biserial por pregunta.

    - dificultad (p): proporción de aciertos (alto = fácil).
    - discriminacion (D): p del 27 % superior − p del 27 % inferior.
    - r_pbis: correlación de la pregunta con el puntaje del resto del
      examen (corregida: excluye la propia pregunta).
    """
    m = _validar_binario(m)
    total = m.sum(axis=1)
    n = len(m)
    g = max(1, int(round(n * grupo)))
    orden = total.sort_values(kind="mergesort").index
    inferior, superior = orden[:g], orden[-g:]

    filas = []
    for item in m.columns:
        x = m[item]
        resto = total - x
        if x.std(ddof=0) == 0 or resto.std(ddof=0) == 0:
            r = float("nan")
        else:
            r = float(np.corrcoef(x, resto)[0, 1])
        p = float(x.mean())
        d = float(x[superior].mean() - x[inferior].mean())
        filas.append({"pregunta": item, "dificultad": round(p, 3),
                      "discriminacion": round(d, 3),
                      "r_pbis": round(r, 3) if not np.isnan(r) else np.nan,
                      "diagnostico": diagnosticar(p, d, r)})
    return pd.DataFrame(filas).set_index("pregunta")


def diagnosticar(p: float, d: float, r: float = float("nan")) -> str:
    """Criterios de Ebel para la discriminación y rangos usuales de dificultad.

    Una correlación punto-biserial negativa (r < -0,10) indica que la
    pregunta la aciertan más los que peor rinden: clave probablemente mal.
    """
    if d < 0 or (not np.isnan(r) and r < -0.10):
        return "Revisar clave: discrimina al revés"
    if d < 0.20:
        calidad = "Descartar o reformular"
    elif d < 0.30:
        calidad = "Mejorar"
    elif d < 0.40:
        calidad = "Buena"
    else:
        calidad = "Excelente"
    if p > 0.90:
        return f"{calidad} (muy fácil)"
    if p < 0.20:
        return f"{calidad} (muy difícil)"
    return calidad


def distractores(respuestas: pd.DataFrame, clave: dict[str, str]) -> pd.DataFrame:
    """Proporción de estudiantes que eligió cada opción en cada pregunta."""
    filas = []
    for preg, correcta in clave.items():
        r = respuestas[preg].astype("string").str.strip().str.upper().fillna("(blanco)")
        frec = r.value_counts(normalize=True)
        for opcion, prop in frec.items():
            filas.append({"pregunta": preg, "opcion": opcion,
                          "proporcion": round(float(prop), 3),
                          "es_correcta": opcion == str(correcta).strip().upper()})
    return pd.DataFrame(filas)
