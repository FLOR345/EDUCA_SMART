import pandas as pd

from src import analytics, grading, risk
from src.storage import Historial


def _curso():
    return pd.DataFrame({
        "codigo": ["bueno", "malo", "cae"],
        "asistencia": [98, 60, 90],
        "PC1": [18, 6, 16],
        "PC2": [17, 7, 9],
    })


def test_riesgo_ordena_y_clasifica():
    r = risk.indice_riesgo(_curso(), ["PC1", "PC2"])
    assert r.iloc[0]["codigo"] == "malo"
    assert r.set_index("codigo").loc["malo", "nivel_riesgo"] == "Alto"
    assert r.set_index("codigo").loc["bueno", "nivel_riesgo"] == "Bajo"
    assert r["indice_riesgo"].between(0, 1).all()


def test_riesgo_detecta_tendencia():
    f = risk.factores(_curso(), ["PC1", "PC2"]).set_axis(["bueno", "malo", "cae"])
    assert f.loc["cae", "tendencia"] > 0.9
    assert f.loc["bueno", "tendencia"] < 0.2


def test_riesgo_sin_asistencia():
    df = _curso().drop(columns="asistencia")
    r = risk.indice_riesgo(df, ["PC1", "PC2"], asistencia_col="asistencia")
    assert (r["indice_riesgo"] >= 0).all()


def test_resumen_y_niveles():
    df = pd.DataFrame({"codigo": list("abcd"), "EF": [5, 11, 15, 19]})
    f = grading.calcular_finales(df, {"EF": 1})
    r = analytics.resumen(f)
    assert r["aprobados"] == 3 and r["tasa_aprobacion"] == 75.0
    niv = analytics.niveles_logro(f)
    assert niv["estudiantes"].tolist() == [1, 1, 1, 1]


def test_historial_guarda_y_reemplaza(tmp_path):
    h = Historial(tmp_path / "h.db")
    df = _curso()
    i = h.guardar("Estadística", "2026-II", {"PC1": 0.5, "PC2": 0.5}, df)
    j = h.guardar("Estadística", "2026-II", {"PC1": 0.4, "PC2": 0.6}, df)
    assert i == j and len(h.listar()) == 1
    pesos, datos = h.cargar(i)
    assert pesos["PC2"] == 0.6
    assert datos["PC1"].tolist() == df["PC1"].tolist()
    h.eliminar(i)
    assert h.listar().empty
