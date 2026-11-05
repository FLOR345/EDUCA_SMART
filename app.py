"""EDUCA-SMART - interfaz Streamlit (ejecución local).

Uso:  streamlit run app.py
"""
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from src import __version__, analytics, grading, item_analysis, reports, risk
from src.storage import Historial

RAIZ = Path(__file__).resolve().parent
EJEMPLOS = RAIZ / "examples"
NO_EVALUACION = {"codigo", "asistencia", "dni", "edad", "ciclo"}

st.set_page_config(page_title="EDUCA-SMART", page_icon="🎓", layout="wide")


# ---------- utilidades ----------
def leer_tabla(archivo) -> pd.DataFrame:
    nombre = getattr(archivo, "name", str(archivo)).lower()
    if nombre.endswith((".xlsx", ".xls")):
        return pd.read_excel(archivo)
    return pd.read_csv(archivo, sep=None, engine="python", encoding="utf-8-sig")


def candidatas_evaluacion(df: pd.DataFrame) -> list[str]:
    cols = []
    for c in df.columns:
        if c.lower() in NO_EVALUACION:
            continue
        v = pd.to_numeric(df[c], errors="coerce")
        if v.notna().mean() >= 0.5 and v.min() >= 0 and v.max() <= 20:
            cols.append(c)
    return cols


@st.cache_resource
def historial() -> Historial:
    return Historial()


def hay_notas() -> bool:
    return "finales" in st.session_state


# ---------- barra lateral ----------
st.sidebar.title("🎓 EDUCA-SMART")
st.sidebar.caption(f"v{__version__} · gestión de aprendizaje y evaluación")
pagina = st.sidebar.radio("Módulo", [
    "1. Registro de notas", "2. Calificaciones", "3. Estadísticas del curso",
    "4. Alerta temprana", "5. Análisis de examen", "6. Historial", "7. Informe"])
if hay_notas():
    st.sidebar.success(f"{st.session_state.curso} · {len(st.session_state.finales)} estudiantes")

# ---------- 1. Registro ----------
if pagina.startswith("1"):
    st.title("Registro de notas")
    st.write("Cargue un CSV o Excel con **una fila por estudiante** y una columna por "
             "evaluación (escala 0-20). Columnas opcionales: `asistencia` (%) y `seccion`.")
    c1, c2 = st.columns([3, 1])
    archivo = c1.file_uploader("Archivo de notas", type=["csv", "xlsx", "xls", "txt"])
    if c2.button("Usar datos de ejemplo", width="stretch"):
        st.session_state.crudo = leer_tabla(EJEMPLOS / "notas_curso.csv")
        st.session_state.archivo = "notas_curso.csv (ejemplo)"
    if archivo is not None and st.session_state.get("archivo") != archivo.name:
        try:
            st.session_state.crudo = leer_tabla(archivo)
            st.session_state.archivo = archivo.name
        except Exception as e:  # archivo dañado o con formato no reconocido
            st.error(f"No se pudo leer el archivo: {e}")

    if "crudo" in st.session_state:
        df = st.session_state.crudo
        st.caption(f"{st.session_state.archivo}: {len(df)} filas × {df.shape[1]} columnas")
        st.dataframe(df.head(10), width="stretch")

        c1, c2, c3 = st.columns(3)
        curso = c1.text_input("Curso", st.session_state.get("curso", "Estadística I"))
        periodo = c2.text_input("Periodo", st.session_state.get("periodo", "2026-II"))
        id_col = c3.selectbox("Columna de código", df.columns,
                              index=list(df.columns).index("codigo") if "codigo" in df.columns else 0)

        st.subheader("Sistema de evaluación")
        sugeridas = candidatas_evaluacion(df)
        evals = st.multiselect("Evaluaciones que componen la nota", sugeridas, default=sugeridas)
        if evals:
            base = st.session_state.get("pesos", {})
            tabla = pd.DataFrame({"evaluacion": evals,
                                  "peso_%": [round(base[e] * 100, 1) if e in base
                                             else round(100 / len(evals), 1) for e in evals]})
            tabla = st.data_editor(tabla, hide_index=True, disabled=["evaluacion"],
                                   width="stretch")
            total = tabla["peso_%"].sum()
            (st.success if abs(total - 100) < 0.01 else st.warning)(
                f"Suma de pesos: {total:.1f} %" + ("" if abs(total - 100) < 0.01
                                                   else " (se normalizará a 100 %)"))
            errores = grading.validar_notas(df, evals)
            if errores:
                st.error("Corrija estos datos antes de calcular:")
                st.write(errores[:20])
            elif st.button("Calcular calificaciones", type="primary"):
                try:
                    pesos = dict(zip(tabla["evaluacion"], tabla["peso_%"]))
                    pesos_n = grading.validar_pesos(pesos)
                    st.session_state.update(
                        pesos=pesos_n, evaluaciones=evals, curso=curso, periodo=periodo,
                        finales=grading.calcular_finales(df, pesos_n, id_col=id_col),
                        id_col=id_col)
                    st.success("Listo. Revise los demás módulos en la barra lateral.")
                except ValueError as e:
                    st.error(str(e))

# ---------- 2. Calificaciones ----------
elif pagina.startswith("2"):
    st.title("Calificaciones finales")
    if not hay_notas():
        st.info("Primero cargue y calcule las notas en *1. Registro de notas*.")
        st.stop()
    f = st.session_state.finales
    pesos = st.session_state.pesos
    st.caption("Fórmula: " + " + ".join(f"{w * 100:.0f}% {e}" for e, w in pesos.items())
               + f" · aprobado con {grading.NOTA_APROBATORIA} o más")
    filtro = st.radio("Mostrar", ["Todos", "Aprobados", "Desaprobados", "Con pendientes"],
                      horizontal=True)
    vista = {"Aprobados": f[f.condicion == "Aprobado"],
             "Desaprobados": f[f.condicion == "Desaprobado"],
             "Con pendientes": f[f.pendientes > 0]}.get(filtro, f)
    st.dataframe(vista.reset_index(drop=True), width="stretch", height=420,
                 column_config={"nota_final": st.column_config.NumberColumn(format="%d")})

    st.subheader("¿Cuánto necesita en la última evaluación?")
    c1, c2 = st.columns(2)
    est = c1.selectbox("Estudiante", f.index)
    restante = c2.selectbox("Evaluación pendiente", list(pesos), index=len(pesos) - 1)
    actuales = {e: f.at[est, e] for e in pesos if e != restante and pd.notna(f.at[est, e])}
    req = grading.nota_necesaria(actuales, pesos, restante)
    if req is None:
        st.error("Aun con 20 en esa evaluación no alcanza la nota aprobatoria.")
    elif req == 0:
        st.success("Ya tiene la nota aprobatoria asegurada.")
    else:
        st.info(f"Necesita al menos **{req}** en {restante} para aprobar.")

# ---------- 3. Estadísticas ----------
elif pagina.startswith("3"):
    st.title("Estadísticas del curso")
    if not hay_notas():
        st.info("Primero cargue y calcule las notas en *1. Registro de notas*.")
        st.stop()
    f = st.session_state.finales
    r = analytics.resumen(f)
    c = st.columns(5)
    c[0].metric("Estudiantes", r["estudiantes"])
    c[1].metric("Promedio", r["promedio"])
    c[2].metric("Desviación", r["desviacion"])
    c[3].metric("Aprobados", f'{r["aprobados"]}')
    c[4].metric("Tasa de aprobación", f'{r["tasa_aprobacion"]} %')

    c1, c2 = st.columns(2)
    fig = px.histogram(f, x="nota_final", nbins=21, range_x=[-0.5, 20.5],
                       color="condicion", title="Distribución de notas finales",
                       color_discrete_map={"Aprobado": "#2e7d32", "Desaprobado": "#c62828"})
    fig.add_vline(x=grading.NOTA_APROBATORIA - 0.5, line_dash="dash")
    c1.plotly_chart(fig, width="stretch")
    niv = analytics.niveles_logro(f)
    c2.plotly_chart(px.bar(niv, x="nivel", y="estudiantes", text="porcentaje",
                           title="Niveles de logro"), width="stretch")

    st.subheader("Por evaluación")
    pe = analytics.por_evaluacion(f, st.session_state.evaluaciones)
    st.dataframe(pe, hide_index=True, width="stretch")
    larga = f.melt(value_vars=st.session_state.evaluaciones, var_name="evaluacion", value_name="nota")
    st.plotly_chart(px.box(larga, x="evaluacion", y="nota", points="all",
                           title="Notas por evaluación"), width="stretch")

    categoricas = [c for c in f.columns if f[c].dtype == object and 1 < f[c].nunique() <= 10]
    if categoricas:
        st.subheader("Comparación por grupo")
        g = st.selectbox("Agrupar por", categoricas)
        st.dataframe(analytics.por_grupo(f, g), hide_index=True, width="stretch")

# ---------- 4. Alerta temprana ----------
elif pagina.startswith("4"):
    st.title("Alerta temprana de riesgo académico")
    if not hay_notas():
        st.info("Primero cargue y calcule las notas en *1. Registro de notas*.")
        st.stop()
    f = st.session_state.finales
    evals = st.session_state.evaluaciones
    st.write("Seleccione las evaluaciones **ya rendidas** hasta la fecha. El índice combina "
             "rendimiento, asistencia, tendencia y evaluaciones pendientes.")
    rendidas = st.multiselect("Evaluaciones a considerar", evals, default=evals[:max(1, len(evals) - 1)])
    with st.expander("Pesos del índice"):
        cols = st.columns(4)
        pesos_r = {k: cols[i].slider(k, 0.0, 1.0, v, 0.05)
                   for i, (k, v) in enumerate(risk.PESOS_RIESGO.items())}
    if not rendidas:
        st.stop()
    asis = "asistencia" if "asistencia" in f.columns else None
    try:
        rr = risk.indice_riesgo(f, rendidas, asis, pesos_r)
    except ValueError as e:
        st.error(str(e))
        st.stop()
    st.session_state.riesgo = rr
    c = st.columns(3)
    for col, nivel in zip(c, ["Alto", "Medio", "Bajo"]):
        col.metric(f"Riesgo {nivel.lower()}", int((rr.nivel_riesgo == nivel).sum()))
    mostrar = [x for x in [st.session_state.id_col, "apellidos", "nombres", "seccion", "asistencia"]
               if x in rr.columns] + rendidas + ["indice_riesgo", "nivel_riesgo",
                                                 "factor_principal", "recomendacion"]
    solo = st.checkbox("Mostrar solo riesgo alto y medio", value=True)
    vista = rr[rr.nivel_riesgo != "Bajo"] if solo else rr
    st.dataframe(vista[mostrar].reset_index(drop=True), width="stretch", height=420,
                 column_config={"indice_riesgo": st.column_config.ProgressColumn(
                     min_value=0, max_value=1, format="%.2f")})
    st.caption("El índice orienta la tutoría; la decisión final es del docente.")

# ---------- 5. Examen ----------
elif pagina.startswith("5"):
    st.title("Análisis de examen")
    st.write("Cargue las respuestas (una fila por estudiante, una columna por pregunta) y la "
             "clave (columnas `pregunta`, `clave`). Si las respuestas ya son 0/1, la clave no es necesaria.")
    c1, c2 = st.columns(2)
    f_resp = c1.file_uploader("Respuestas", type=["csv", "xlsx", "xls"], key="resp")
    f_clave = c2.file_uploader("Clave (opcional)", type=["csv", "xlsx", "xls"], key="clave")
    if st.button("Usar examen de ejemplo"):
        st.session_state.ex_resp = leer_tabla(EJEMPLOS / "examen_respuestas.csv").astype({"codigo": str})
        st.session_state.ex_clave = leer_tabla(EJEMPLOS / "examen_clave.csv")
    if f_resp is not None:
        st.session_state.ex_resp = leer_tabla(f_resp)
        st.session_state.ex_clave = leer_tabla(f_clave) if f_clave is not None else None
    if "ex_resp" not in st.session_state:
        st.stop()

    resp = st.session_state.ex_resp
    clave_df = st.session_state.get("ex_clave")
    id_cols = [c for c in resp.columns if c.lower() in ("codigo", "id", "dni", "nombre", "nombres")]
    preguntas = [c for c in resp.columns if c not in id_cols]
    try:
        if clave_df is not None:
            clave = dict(zip(clave_df.iloc[:, 0].astype(str), clave_df.iloc[:, 1].astype(str)))
            m = item_analysis.calificar(resp[preguntas], clave)
        else:
            clave = None
            m = resp[preguntas]
        tabla = item_analysis.analizar_items(m)
        alfa = item_analysis.kr20(m)
    except ValueError as e:
        st.error(str(e))
        st.stop()

    puntaje = m.sum(axis=1)
    vigesimal = (puntaje / m.shape[1] * 20).round(1)
    c = st.columns(4)
    c[0].metric("Estudiantes", len(m))
    c[1].metric("Preguntas", m.shape[1])
    c[2].metric("Confiabilidad KR-20", f"{alfa:.2f}")
    c[3].metric("Nota promedio (0-20)", f"{vigesimal.mean():.1f}")
    st.caption("KR-20 ≥ 0,70 suele considerarse aceptable para exámenes de aula.")

    st.subheader("Calidad de cada pregunta")
    st.dataframe(tabla, width="stretch", height=380)
    fig = px.scatter(tabla.reset_index(), x="dificultad", y="discriminacion", text="pregunta",
                     color="diagnostico", title="Mapa de preguntas")
    fig.add_hline(y=0.2, line_dash="dash")
    fig.update_traces(textposition="top center")
    st.plotly_chart(fig, width="stretch")
    revisar = tabla[tabla.discriminacion < 0.2]
    if not revisar.empty:
        st.warning(f"Revise estas preguntas: {', '.join(revisar.index)}")

    if clave:
        st.subheader("Distractores")
        p = st.selectbox("Pregunta", list(clave))
        d = item_analysis.distractores(resp, {p: clave[p]})
        st.plotly_chart(px.bar(d, x="opcion", y="proporcion", color="es_correcta",
                               title=f"Opciones elegidas en {p}"), width="stretch")
    st.session_state.examen = tabla.reset_index()

# ---------- 6. Historial ----------
elif pagina.startswith("6"):
    st.title("Historial de cursos")
    h = historial()
    if hay_notas():
        if st.button(f"Guardar {st.session_state.curso} ({st.session_state.periodo})", type="primary"):
            h.guardar(st.session_state.curso, st.session_state.periodo,
                      st.session_state.pesos, st.session_state.crudo)
            st.success("Curso guardado en el equipo (data/educa_smart.db).")
    lista = h.listar()
    if lista.empty:
        st.info("Aún no hay cursos guardados.")
        st.stop()
    st.dataframe(lista, hide_index=True, width="stretch")
    sel = st.selectbox("Curso", lista.id, format_func=lambda i: " · ".join(
        lista.loc[lista.id == i, ["nombre", "periodo"]].iloc[0]))
    c1, c2 = st.columns(2)
    if c1.button("Abrir"):
        pesos, crudo = h.cargar(int(sel))
        fila = lista[lista.id == sel].iloc[0]
        id_col = "codigo" if "codigo" in crudo.columns else crudo.columns[0]
        st.session_state.update(crudo=crudo, pesos=pesos, evaluaciones=list(pesos),
                                curso=fila.nombre, periodo=fila.periodo, id_col=id_col,
                                archivo=f"historial: {fila.nombre}",
                                finales=grading.calcular_finales(crudo, pesos, id_col))
        st.rerun()
    if c2.button("Eliminar"):
        h.eliminar(int(sel))
        st.rerun()

# ---------- 7. Informe ----------
else:
    st.title("Informe en Excel")
    if not hay_notas():
        st.info("Primero cargue y calcule las notas en *1. Registro de notas*.")
        st.stop()
    f = st.session_state.finales
    r = analytics.resumen(f)
    hojas = {
        "Resumen": pd.DataFrame({"indicador": list(r), "valor": list(r.values())}),
        "Calificaciones": f.reset_index(drop=True),
        "Por evaluacion": analytics.por_evaluacion(f, st.session_state.evaluaciones),
        "Niveles de logro": analytics.niveles_logro(f),
        "Pesos": pd.DataFrame({"evaluacion": list(st.session_state.pesos),
                               "peso": list(st.session_state.pesos.values())}),
    }
    if "riesgo" in st.session_state:
        hojas["Alerta temprana"] = st.session_state.riesgo.reset_index(drop=True)
    if "examen" in st.session_state:
        hojas["Analisis de examen"] = st.session_state.examen
    st.write("El libro incluirá estas hojas:", ", ".join(hojas))
    nombre = f"EDUCA-SMART_{st.session_state.curso}_{st.session_state.periodo}.xlsx".replace(" ", "_")
    st.download_button("Descargar Excel", reports.a_excel(hojas), file_name=nombre,
                       mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                       type="primary")
