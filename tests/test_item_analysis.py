import numpy as np
import pandas as pd
import pytest

from src import item_analysis as ia


def test_calificar_con_clave():
    resp = pd.DataFrame({"P1": ["a", "B", None], "P2": ["C", "C", "D"]})
    m = ia.calificar(resp, {"P1": "A", "P2": "C"})
    assert m["P1"].tolist() == [1, 0, 0]
    assert m["P2"].tolist() == [1, 1, 0]


def test_clave_con_pregunta_inexistente():
    with pytest.raises(ValueError):
        ia.calificar(pd.DataFrame({"P1": ["A"]}), {"P9": "A"})


def test_kr20_valor_conocido():
    # KR-20 a mano: k=3, sum(pq)=0.625, var=1.667 -> 1.5*(1-0.375)=0.9375
    m = pd.DataFrame({"a": [1, 1, 1, 0], "b": [1, 1, 0, 0], "c": [1, 0, 0, 0]})
    p = m.mean()
    var = m.sum(axis=1).var(ddof=1)
    esperado = 3 / 2 * (1 - (p * (1 - p)).sum() / var)
    assert np.isclose(ia.kr20(m), esperado)
    assert np.isclose(ia.kr20(m), 0.9375)


def test_discriminacion_y_diagnostico():
    # Item "bueno" lo aciertan los mejores; "malo" lo aciertan los peores.
    n = 20
    total_alto = [1] * 10 + [0] * 10
    m = pd.DataFrame({f"x{i}": total_alto for i in range(5)})
    m["bueno"] = total_alto
    m["malo"] = [0] * 10 + [1] * 10
    t = ia.analizar_items(m)
    assert t.loc["bueno", "discriminacion"] == 1.0
    assert t.loc["malo", "discriminacion"] < 0
    assert t.loc["malo", "diagnostico"].startswith("Revisar clave")
    assert len(t) == 7 and n == len(m)


def test_rechaza_valores_no_binarios():
    with pytest.raises(ValueError):
        ia.analizar_items(pd.DataFrame({"a": [0, 2], "b": [1, 0]}))


def test_ejemplo_detecta_pregunta_con_clave_mal():
    from pathlib import Path
    ej = Path(__file__).resolve().parent.parent / "examples"
    resp = pd.read_csv(ej / "examen_respuestas.csv", keep_default_na=False)
    clave = pd.read_csv(ej / "examen_clave.csv")
    m = ia.calificar(resp.drop(columns="codigo").replace("", None),
                     dict(zip(clave.pregunta, clave.clave)))
    t = ia.analizar_items(m)
    assert t.loc["P4", "r_pbis"] < 0             # generada con discriminación negativa
    assert t.loc["P4", "diagnostico"].startswith("Revisar clave")
    assert t.loc["P8", "dificultad"] > 0.85        # generada muy fácil
