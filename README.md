# EDUCA-SMART

Plataforma local (Python + Streamlit) para la **gestión inteligente del aprendizaje y la evaluación académica**: calcula calificaciones en escala vigesimal, analiza el rendimiento del curso, identifica a tiempo a los estudiantes en riesgo de desaprobar y evalúa la calidad de los exámenes.

> Versión 0.1.0 (MVP). Autoría: Flor Melany Yanarico Huanca.

## Qué hace

| Módulo | Contenido |
|---|---|
| 1. Registro de notas | Carga CSV o Excel, detecta las columnas de evaluación, define los pesos de cada una y valida que las notas estén entre 0 y 20 |
| 2. Calificaciones | Promedio ponderado, nota final redondeada, condición (aprobado/desaprobado), evaluaciones pendientes y la nota mínima que un estudiante necesita en la evaluación restante para aprobar |
| 3. Estadísticas del curso | Promedio, desviación, tasa de aprobación, distribución de notas, niveles de logro, resultados por evaluación y comparación entre secciones |
| 4. Alerta temprana | Índice de riesgo académico (0-1) con nivel bajo/medio/alto, el factor que más pesa y una recomendación de tutoría |
| 5. Análisis de examen | Dificultad, discriminación y correlación punto-biserial por pregunta, confiabilidad KR-20 y análisis de distractores |
| 6. Historial | Guarda y vuelve a abrir cursos por periodo en una base SQLite local |
| 7. Informe | Descarga un Excel con calificaciones, estadísticas, alertas y análisis del examen |

## Criterios de cálculo

### Calificaciones (`src/grading.py`)

- Escala vigesimal (0-20). **Nota aprobatoria: 11.**
- Nota final = promedio ponderado de las evaluaciones, redondeado con 0,5 hacia arriba (10,5 → 11).
- Los pesos se normalizan para que sumen 100 %.
- Una evaluación no rendida cuenta como 0 y se informa en la columna `pendientes`.

### Índice de riesgo (`src/risk.py`)

Combina cuatro factores, cada uno entre 0 (sin riesgo) y 1 (riesgo máximo):

| Factor | Peso por defecto | Cómo se mide |
|---|---|---|
| Rendimiento | 0,45 | Distancia del promedio parcial a la nota aprobatoria (13 o más → 0; 7 o menos → 1) |
| Asistencia | 0,25 | 90 % o más → 0; 70 % o menos → 1 |
| Tendencia | 0,15 | Caída entre la primera y la última evaluación rendida |
| Pendientes | 0,15 | Proporción de evaluaciones no rendidas |

Niveles: **bajo** (< 0,35), **medio** (0,35-0,60) y **alto** (≥ 0,60). Los pesos se pueden ajustar en la app. El índice orienta la tutoría; la decisión final es del docente.

### Análisis de examen (`src/item_analysis.py`)

Basado en la teoría clásica de los tests:

- **Dificultad (p):** proporción de aciertos. Más de 0,90 es muy fácil; menos de 0,20, muy difícil.
- **Discriminación (D):** aciertos del 27 % superior menos los del 27 % inferior. Criterios de Ebel: ≥ 0,40 excelente, 0,30-0,39 buena, 0,20-0,29 mejorar, < 0,20 descartar o reformular.
- **Punto-biserial corregida:** correlación de la pregunta con el puntaje del resto del examen. Si es negativa, la pregunta probablemente tiene la clave mal puesta.
- **KR-20:** confiabilidad del examen; ≥ 0,70 suele considerarse aceptable en exámenes de aula.

## Instalación y uso

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
streamlit run app.py
pytest                           # 17 pruebas
```

En la app, use **Usar datos de ejemplo** (módulo 1) y **Usar examen de ejemplo** (módulo 5) para probarla sin datos propios.

### Formato de los archivos

**Notas** (CSV o Excel): una fila por estudiante y una columna por evaluación.

```
codigo,apellidos,nombres,seccion,asistencia,PC1,PC2,EP,TA,EF
20260001,Quispe Huanca,Raúl,A,76.8,9.3,8.9,12.0,11.4,12.6
```

`asistencia` (en %) y `seccion` son opcionales.

**Examen:** un archivo de respuestas (una fila por estudiante, una columna por pregunta, con las letras marcadas) y otro con la clave (columnas `pregunta` y `clave`). Si las respuestas ya están en 0/1, la clave no es necesaria.

## Datos de ejemplo

Los archivos de `examples/` son **ficticios** y se generan con:

```bash
python scripts/generar_ejemplos.py
```

## Privacidad

Todo se procesa **en el equipo del usuario**; no se envía ningún dato a internet. El historial se guarda en `data/educa_smart.db`, que está excluido del repositorio para no publicar notas de estudiantes.

## Estructura

```
app.py              interfaz Streamlit
src/
  grading.py        calificaciones y nota necesaria
  analytics.py      estadísticas del curso
  risk.py           alerta temprana
  item_analysis.py  análisis psicométrico de exámenes
  storage.py        historial en SQLite
  reports.py        exportación a Excel
scripts/            generador de datos de ejemplo
examples/           datos ficticios de práctica
tests/              pruebas con pytest
```

## Licencia

Pendiente de definir.
