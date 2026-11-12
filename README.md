<p align="center"><img src="web/public/marca/yachaq-720.webp" alt="YachaQ" width="360"></p>

# YachaQ

*Yachaq*, en quechua, es "el que sabe".

Plataforma para la **gestión inteligente del aprendizaje y la evaluación académica**: calcula calificaciones en escala vigesimal, analiza el rendimiento del curso, identifica a tiempo a los estudiantes en riesgo de desaprobar y evalúa la calidad de los exámenes.

Tiene dos versiones con los mismos cálculos:

- **App web** (`web/`, React + TypeScript): se publica en internet y funciona por completo en el navegador. Las notas nunca salen del equipo del docente.
- **Versión Python** (`app.py` y `src/`, Streamlit): para uso local y como implementación de referencia.

Las pruebas de la app web comparan cada resultado con la versión Python sobre los mismos datos (`web/tests/paridad.test.ts`).

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

Niveles: **bajo** (hasta 0,35), **medio** (más de 0,35 y hasta 0,60) y **alto** (más de 0,60). Los pesos se pueden ajustar en la app. El índice orienta la tutoría; la decisión final es del docente.

### Análisis de examen (`src/item_analysis.py`)

Basado en la teoría clásica de los tests:

- **Dificultad (p):** proporción de aciertos. Más de 0,90 es muy fácil; menos de 0,20, muy difícil.
- **Discriminación (D):** aciertos del 27 % superior menos los del 27 % inferior. Criterios de Ebel: ≥ 0,40 excelente, 0,30-0,39 buena, 0,20-0,29 mejorar, < 0,20 descartar o reformular.
- **Punto-biserial corregida:** correlación de la pregunta con el puntaje del resto del examen. Si es negativa, la pregunta probablemente tiene la clave mal puesta.
- **KR-20:** confiabilidad del examen; ≥ 0,70 suele considerarse aceptable en exámenes de aula.

## App web

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas de paridad con la versión Python
npm run build    # genera web/dist para publicar
```

La app abre con datos de ejemplo ficticios para que cualquiera pueda probarla. Desde **Notas y pesos** se cargan las notas reales (CSV o Excel) y el examen. Todo se guarda solo en el navegador.

### Publicar en Vercel

1. En [vercel.com](https://vercel.com), **Add New → Project** e importar este repositorio.
2. En **Root Directory** elegir `web`. Vercel detecta Vite solo (build: `npm run build`, salida: `dist`).
3. **Deploy**. Cada `git push` a `main` vuelve a publicar la app.

## Versión Python

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
streamlit run app.py
pytest                           # 17 pruebas
```

En la app Python, use **Usar datos de ejemplo** (módulo 1) y **Usar examen de ejemplo** (módulo 5) para probarla sin datos propios.

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
python scripts/exportar_referencia.py   # actualiza la referencia que usan las pruebas de la app web
```

## Privacidad

Todo se procesa **en el equipo del usuario**; no se envía ningún dato a internet, tampoco en la app web publicada: los archivos se leen en el navegador y el curso se guarda en su almacenamiento local. En la versión Python, el historial se guarda en `data/yachaq.db`, que está excluido del repositorio para no publicar notas de estudiantes.

## Estructura

```
web/                app web (React + TypeScript + Vite)
  src/lib/          cálculos: notas, riesgo, ítems, estadísticas, lectura de archivos
  src/pantallas/    resumen, estudiantes, alerta temprana, examen, notas y pesos
  tests/            pruebas de paridad con la versión Python
app.py              interfaz Streamlit
src/
  grading.py        calificaciones y nota necesaria
  analytics.py      estadísticas del curso
  risk.py           alerta temprana
  item_analysis.py  análisis psicométrico de exámenes
  storage.py        historial en SQLite
  reports.py        exportación a Excel
scripts/            datos de ejemplo y referencia para las pruebas
examples/           datos ficticios de práctica
tests/              pruebas con pytest
```

## Licencia

Pendiente de definir.
