import math

import pandas as pd
import pytest

from src import grading


def test_redondeo_vigesimal():
    assert grading.redondear(10.5) == 11      # no redondeo bancario
    assert grading.redondear(10.49) == 10
    assert grading.redondear(12.5) == 13


def test_pesos_se_normalizan():
    p = grading.validar_pesos({"a": 30, "b": 70})
    assert math.isclose(sum(p.values()), 1)
    assert math.isclose(p["a"], 0.3)


def test_pesos_invalidos():
    with pytest.raises(ValueError):
        grading.validar_pesos({"a": 0})
    with pytest.raises(ValueError):
        grading.validar_pesos({})


def test_calcular_finales():
    df = pd.DataFrame({"codigo": ["1", "2"], "EP": [10, 20], "EF": [11, None]})
    f = grading.calcular_finales(df, {"EP": 50, "EF": 50})
    assert f.loc["1", "promedio"] == 10.5
    assert f.loc["1", "nota_final"] == 11
    assert f.loc["1", "condicion"] == "Aprobado"
    assert f.loc["2", "pendientes"] == 1            # EF no rendido cuenta 0
    assert f.loc["2", "nota_final"] == 10


def test_validar_notas_detecta_errores():
    df = pd.DataFrame({"EP": [10, 25, "abc"]})
    errores = grading.validar_notas(df, ["EP", "EF"])
    assert any("fuera de 0-20" in e for e in errores)
    assert any("no es un número" in e for e in errores)
    assert any("Falta la columna" in e for e in errores)


def test_nota_necesaria():
    pesos = {"EP": 50, "EF": 50}
    assert grading.nota_necesaria({"EP": 10}, pesos, "EF") == 11.0
    assert grading.nota_necesaria({"EP": 20}, pesos, "EF") == 1.0
    assert grading.nota_necesaria({"EP": 0}, pesos, "EF") is None
    assert grading.nota_necesaria({"EP": 20}, {"EP": 90, "EF": 10}, "EF") == 0.0
