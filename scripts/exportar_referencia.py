"""Exporta los resultados de la versión Python sobre los datos de ejemplo.

La app web (web/) compara sus cálculos con este archivo en sus pruebas,
para garantizar que ambas versiones den exactamente lo mismo.

Uso:  python scripts/exportar_referencia.py
"""
import json
import math
import sys
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from src import analytics, grading, item_analysis, risk  # noqa: E402

EJ = RAIZ / "examples"
EVALS = ["PC1", "PC2", "EP", "TA", "EF"]
PESOS = {"PC1": 15, "PC2": 15, "EP": 25, "TA": 15, "EF": 30}


def limpio(v):
    if isinstance(v, float) and math.isnan(v):
        return None
    if hasattr(v, "item"):
        return v.item()
    return v


def main():
    notas = pd.read_csv(EJ / "notas_curso.csv", dtype={"codigo": str})
    f = grading.calcular_finales(notas, PESOS)
    finales = {c: {"promedio": limpio(f.at[c, "promedio"]), "nota_final": limpio(f.at[c, "nota_final"]),
                   "pendientes": limpio(f.at[c, "pendientes"])} for c in f.index}

    rendidas = EVALS[:4]
    rr = risk.indice_riesgo(notas, rendidas, "asistencia")
    riesgo = {r.codigo: {"indice": limpio(r.indice_riesgo), "nivel": r.nivel_riesgo,
                         "factor": r.factor_principal} for r in rr.itertuples()}

    resp = pd.read_csv(EJ / "examen_respuestas.csv", dtype=str)
    clave = pd.read_csv(EJ / "examen_clave.csv")
    clave_d = dict(zip(clave.pregunta, clave.clave))
    m = item_analysis.calificar(resp.drop(columns="codigo"), clave_d)
    items = item_analysis.analizar_items(m)

    salida = {
        "pesos": PESOS,
        "rendidas": rendidas,
        "finales": finales,
        "resumen": {k: limpio(v) for k, v in analytics.resumen(f).items()},
        "riesgo": riesgo,
        "kr20": item_analysis.kr20(m),
        "items": {p: {"dificultad": limpio(r.dificultad), "discriminacion": limpio(r.discriminacion),
                      "r_pbis": limpio(r.r_pbis), "diagnostico": r.diagnostico}
                  for p, r in items.iterrows()},
        "nota_necesaria": {
            "a": grading.nota_necesaria({"EP": 10}, {"EP": 50, "EF": 50}, "EF"),
            "b": grading.nota_necesaria({"PC1": 12, "PC2": 9, "EP": 10, "TA": 13}, PESOS, "EF"),
        },
    }
    destino = RAIZ / "web" / "tests" / "referencia_python.json"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Referencia escrita en", destino)


if __name__ == "__main__":
    main()
