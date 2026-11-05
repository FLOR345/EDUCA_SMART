"""Exportación de resultados a Excel."""
from __future__ import annotations

import io

import pandas as pd


def a_excel(hojas: dict[str, pd.DataFrame]) -> bytes:
    """Escribe varias tablas en un libro de Excel y devuelve los bytes."""
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xw:
        for nombre, df in hojas.items():
            if df is None or df.empty:
                continue
            df.to_excel(xw, sheet_name=nombre[:31], index=False)
            hoja = xw.sheets[nombre[:31]]
            for i, col in enumerate(df.columns, start=1):
                ancho = max(len(str(col)), *(len(str(v)) for v in df[col].head(200))) + 2
                hoja.column_dimensions[hoja.cell(1, i).column_letter].width = min(ancho, 50)
    return buf.getvalue()
