"""Historial local de cursos en SQLite (no se envía nada a internet)."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path

import pandas as pd

RUTA_POR_DEFECTO = Path(__file__).resolve().parent.parent / "data" / "educa_smart.db"


class Historial:
    def __init__(self, ruta: str | Path = RUTA_POR_DEFECTO):
        self.ruta = str(ruta)
        if self.ruta != ":memory:":
            Path(self.ruta).parent.mkdir(parents=True, exist_ok=True)
        self.con = sqlite3.connect(self.ruta, check_same_thread=False)
        self.con.execute("""CREATE TABLE IF NOT EXISTS cursos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL, periodo TEXT NOT NULL,
            pesos TEXT NOT NULL, guardado TEXT NOT NULL,
            UNIQUE(nombre, periodo))""")
        self.con.execute("""CREATE TABLE IF NOT EXISTS notas (
            curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
            datos TEXT NOT NULL)""")
        self.con.commit()

    def guardar(self, nombre: str, periodo: str, pesos: dict, notas: pd.DataFrame) -> int:
        """Guarda (o reemplaza) las notas de un curso y periodo."""
        cur = self.con.cursor()
        cur.execute("SELECT id FROM cursos WHERE nombre=? AND periodo=?", (nombre, periodo))
        fila = cur.fetchone()
        ahora = datetime.now().isoformat(timespec="seconds")
        if fila:
            curso_id = fila[0]
            cur.execute("UPDATE cursos SET pesos=?, guardado=? WHERE id=?",
                        (json.dumps(pesos), ahora, curso_id))
            cur.execute("DELETE FROM notas WHERE curso_id=?", (curso_id,))
        else:
            cur.execute("INSERT INTO cursos(nombre, periodo, pesos, guardado) VALUES (?,?,?,?)",
                        (nombre, periodo, json.dumps(pesos), ahora))
            curso_id = cur.lastrowid
        cur.execute("INSERT INTO notas(curso_id, datos) VALUES (?,?)",
                    (curso_id, notas.to_json(orient="split", force_ascii=False)))
        self.con.commit()
        return curso_id

    def listar(self) -> pd.DataFrame:
        return pd.read_sql_query(
            "SELECT id, nombre, periodo, guardado FROM cursos ORDER BY guardado DESC", self.con)

    def cargar(self, curso_id: int) -> tuple[dict, pd.DataFrame]:
        cur = self.con.cursor()
        cur.execute("SELECT pesos FROM cursos WHERE id=?", (curso_id,))
        fila = cur.fetchone()
        if not fila:
            raise KeyError(f"No existe el curso {curso_id}")
        cur.execute("SELECT datos FROM notas WHERE curso_id=?", (curso_id,))
        from io import StringIO
        datos = pd.read_json(StringIO(cur.fetchone()[0]), orient="split")
        return json.loads(fila[0]), datos

    def eliminar(self, curso_id: int) -> None:
        self.con.execute("DELETE FROM notas WHERE curso_id=?", (curso_id,))
        self.con.execute("DELETE FROM cursos WHERE id=?", (curso_id,))
        self.con.commit()
