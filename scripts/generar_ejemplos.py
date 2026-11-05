"""Genera datos ficticios de práctica en examples/ (reproducibles, semilla fija).

Uso:  python scripts/generar_ejemplos.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "examples"
rng = np.random.default_rng(2026)

NOMBRES = ["Ana", "Luis", "Rosa", "Jorge", "Milagros", "Diego", "Carmen", "Iván",
           "Sofía", "Raúl", "Katherine", "Elmer", "Yesenia", "Wilber", "Nayeli",
           "Percy", "Lucía", "Hugo", "Maribel", "Fredy"]
APELLIDOS = ["Quispe", "Mamani", "Condori", "Huanca", "Flores", "Apaza", "Ccama",
             "Ticona", "Pari", "Choque", "Cruz", "Vilca", "Larico", "Coaquira"]


def notas(n=60):
    habilidad = rng.normal(12.5, 3.0, n)
    asistencia = np.clip(rng.normal(0.88, 0.09, n) + (habilidad - 12.5) * 0.01, 0.45, 1.0)
    filas = []
    for i in range(n):
        h = habilidad[i]
        caida = rng.random() < 0.12       # algunos estudiantes empeoran
        evals = {}
        for j, e in enumerate(["PC1", "PC2", "EP", "TA", "EF"]):
            v = h + rng.normal(0, 1.8) - (2.5 * j / 4 if caida else 0)
            evals[e] = float(np.clip(round(v, 1), 0, 20))
        if rng.random() < 0.08:
            evals[rng.choice(["PC2", "EF"])] = np.nan   # evaluación no rendida
        filas.append({"codigo": f"2026{i + 1:04d}",
                      "apellidos": f"{rng.choice(APELLIDOS)} {rng.choice(APELLIDOS)}",
                      "nombres": rng.choice(NOMBRES),
                      "seccion": "A" if i % 2 == 0 else "B",
                      "asistencia": round(float(asistencia[i]) * 100, 1),
                      **evals})
    return pd.DataFrame(filas)


def examen(n=60, k=20):
    opciones = np.array(list("ABCD"))
    clave = rng.choice(opciones, k)
    dificultad = rng.uniform(-1.5, 1.5, k)
    discrim = rng.uniform(0.3, 2.0, k)
    discrim[3] = -2.5                       # una pregunta con la clave mal puesta
    dificultad[7] = -3.5                    # una pregunta demasiado fácil
    theta = rng.normal(0, 1, n)
    filas = []
    for i in range(n):
        fila = {"codigo": f"2026{i + 1:04d}"}
        for j in range(k):
            p = 0.25 + 0.75 / (1 + np.exp(-discrim[j] * (theta[i] - dificultad[j])))
            if rng.random() < 0.02:
                fila[f"P{j + 1}"] = ""
            elif rng.random() < p:
                fila[f"P{j + 1}"] = clave[j]
            else:
                fila[f"P{j + 1}"] = rng.choice(opciones[opciones != clave[j]])
        filas.append(fila)
    clave_df = pd.DataFrame({"pregunta": [f"P{j + 1}" for j in range(k)], "clave": clave})
    return pd.DataFrame(filas), clave_df


if __name__ == "__main__":
    DESTINO.mkdir(exist_ok=True)
    notas().to_csv(DESTINO / "notas_curso.csv", index=False, encoding="utf-8")
    resp, clave = examen()
    resp.to_csv(DESTINO / "examen_respuestas.csv", index=False, encoding="utf-8")
    clave.to_csv(DESTINO / "examen_clave.csv", index=False, encoding="utf-8")
    print("Ejemplos generados en", DESTINO)
