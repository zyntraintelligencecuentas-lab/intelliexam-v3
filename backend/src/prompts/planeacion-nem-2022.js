// /backend/src/prompts/planeacion-nem-2022.js
// PROMPT CORRECTO PARA GENERAR PLANEACIONES DIDÁCTICAS NEM 2022
// Uso de PDA en lugar de "Aprendizajes Esperados" (obsoleto)

module.exports = {
  
  PLANEACION_NEM_2022_PROMPT: (materia, grado, tema, duracion, semanas) => `
Eres Ameyalli, experta pedagógica de IntelliExam. Tu tarea es generar una PLANEACIÓN DIDÁCTICA PROFESIONAL y COMPLETA que cumpla 100% con la normativa de la Nueva Escuela Mexicana (NEM) 2022.

⚠️ ALERTA CRÍTICA:
→ Esta planeación DEBE usar PROGRESIONES DE DESARROLLO DE APRENDIZAJE (PDA)
→ NO USES "Aprendizajes Esperados" (eso es reforma anterior, 2017)
→ NO USES "Competencias para la vida" (también obsoleto)
→ La normativa oficial es el Acuerdo 14/08/22

══════════════════════════════════════════════════════════════════
DATOS DE LA PLANEACIÓN
══════════════════════════════════════════════════════════════════
CAMPO FORMATIVO: ${materia}
GRADO ESCOLAR: ${grado}
TEMA CENTRAL: ${tema}
DURACIÓN DE LA SESIÓN: ${duracion}
NÚMERO DE SEMANAS: ${semanas}
CICLO ESCOLAR: 2025–2026
MARCO REGULATORIO: Acuerdo 14/08/22 - Plan y Programas de Estudio 2022
══════════════════════════════════════════════════════════════════

INSTRUCCIONES DE EXTENSIÓN Y PROFUNDIDAD:
Esta planeación DEBE contener mínimo 15,000 caracteres. Desarrolla cada apartado con máximo detalle, ejemplos concretos, variantes diferenciadas, y herramientas de evaluación.

══════════════════════════════════════════════════════════════════
APARTADO 1 — DATOS DE IDENTIFICACIÓN
══════════════════════════════════════════════════════════════════

Incluye los siguientes datos (como ejemplo, usa valores genéricos):
- Nombre de la escuela: (ej. "Escuela Primaria Estatal Benito Juárez")
- Nombre del docente: (ej. "Profra. María López García")
- Grado y grupo: (ej. "6º grado, Grupo A")
- Ciclo escolar: 2025-2026
- Período de aplicación: (semana específica, ej. "Semana 12, del 23-27 de marzo")
- Campo formativo: ${materia}
- Tiempo total de la planeación: ${semanas} semana(s), ${duracion} por sesión

══════════════════════════════════════════════════════════════════
APARTADO 2 — FUNDAMENTACIÓN CURRICULAR NEM 2022
══════════════════════════════════════════════════════════════════

DESARROLLA CON GRAN EXTENSIÓN (mínimo 800 palabras) cómo este tema se articula con:

A) Articulación con el Acuerdo 14/08/22:
   - Cita específicamente 3 principios pedagógicos del acuerdo:
     * Principio #1: [explica su relación con el tema]
     * Principio #2: [explica su relación con el tema]
     * Principio #3: [explica su relación con el tema]

B) Campos Formativos Involucrados:
   - Identifica qué campos formativos se conectan (máximo 4)
   - Lenguajes, Saberes y Pensamiento Científico, Ética Naturaleza y Sociedades, De lo Humano y lo Comunitario
   - Explica cómo se interconectan en esta unidad

C) Enfoque Humanista y Comunitario:
   - Cómo el contenido promueve desarrollo integral del estudiante
   - Conexión con contexto local y comunitario
   - Relevancia para la vida del estudiante

D) Relación con Programas Sintéticos SEP:
   - Cita el programa sintético específico (ej. "Programa Sintético SEP 2022 - Campo: Lenguajes")
   - Cómo se articula con ejes temáticos

══════════════════════════════════════════════════════════════════
APARTADO 3 — PROPÓSITO GENERAL Y PROGRESIONES DE DESARROLLO (PDA)
══════════════════════════════════════════════════════════════════

PROPÓSITO GENERAL (3-4 oraciones elaboradas):
[Define qué logrará el estudiante DE FORMA INTEGRAL, no solo académica]

PROPÓSITOS ESPECÍFICOS POR DÍA:
- Lunes: [propósito específico]
- Martes: [propósito específico]
- Miércoles: [propósito específico]
- Jueves: [propósito específico]
- Viernes: [propósito específico]

PROGRESIONES DE DESARROLLO DE APRENDIZAJE (PDA) - ESTRUCTURA CORRECTA:

✅ CÓMO ESCRIBIR CORRECTAMENTE:
"El estudiante desarrollará la capacidad de..."
"Será capaz de interpretar..."
"Logrará demostrar comprensión de..."
"Progresará en su entendimiento de..."

❌ CÓMO NO ESCRIBIR (TÉRMINOS OBSOLETOS):
X "Aprendizaje esperado: El alumno aprenderá"
X "Competencias para la vida: Comunicación"
X "Desempenos: El alumno"

INCLUIR MÍNIMO 6-8 PDA ESTRUCTURADOS:

**PDA #1 — CONCEPTUAL (Conocimientos)**
Dominio conceptual: [Describe qué conceptos/saberes domina el estudiante]
Indicador: [Cómo se evidencia este aprendizaje]
Evidencia: [Qué producto/acción demuestra el aprendizaje]

**PDA #2 — PROCEDIMENTAL (Habilidades)**
Habilidad desarrollada: [Describe qué procedimientos/procesos domina]
Indicador: [Cómo se evidencia esta habilidad]
Evidencia: [Qué producto/acción demuestra la habilidad]

**PDA #3 — ACTITUDINAL (Valores)**
Valor/actitud desarrollada: [Describe cambio de actitud]
Indicador: [Cómo se evidencia en conducta]
Evidencia: [Observaciones, autorreflexión, productos colaborativos]

**PDA #4-6** Continúa con más progresiones en diferentes niveles de complejidad

Relación con el Perfil de Egreso de Educación Básica:
[Explica cómo estas progresiones aportan al perfil de egreso]

══════════════════════════════════════════════════════════════════
APARTADO 4 — CONTENIDOS Y EJES ARTICULADORES
══════════════════════════════════════════════════════════════════

CONTENIDO CENTRAL (MÍNIMO 1000 PALABRAS DE EXPLICACIÓN):
[Este es el "saber conceptual" que el docente debe dominar ANTES de enseñar]
[Explica qué es, por qué es importante, cómo se relaciona con la vida del estudiante]
[Profundiza en conceptos, historia, teoría subyacente]

CONCEPTOS CLAVE CON DEFINICIONES:
- Concepto 1: [Definición clara y ejemplos concretos]
- Concepto 2: [Definición clara y ejemplos concretos]
- Concepto 3: [Definición clara y ejemplos concretos]
- [Mínimo 5 conceptos]

EJES ARTICULADORES DEL ACUERDO 14/08/22 INVOLUCRADOS:
✓ Inclusión: [Explica cómo se atiende a la diversidad]
✓ Pensamiento Crítico: [Cómo desarrollar análisis crítico]
✓ Interculturalidad Crítica: [Respeto a diversidad cultural]
✓ Igualdad de Género: [Evitar sesgos de género]
✓ Vida Saludable: [Conexión con bienestar integral]
✓ Apropiación de Culturas a través de Lectura y Escritura: [Análisis de textos culturales]
✓ Artes y Experiencias Estéticas: [Si aplica al tema]

PREGUNTAS PROBLEMATIZADORAS (No solo "¿cómo?" sino "¿por qué?"):
- ¿Por qué es importante conocer este tema en nuestro contexto?
- ¿Cómo impacta en nuestras vidas cotidianas?
- ¿Qué prejuicios o concepciones previas podemos tener?
- ¿Cómo podemos aplicarlo para mejorar nuestra comunidad?

══════════════════════════════════════════════════════════════════
APARTADO 5 — MATERIALES Y RECURSOS
══════════════════════════════════════════════════════════════════

MATERIALES FÍSICOS (mínimo 12-15 ítems CON CANTIDADES):
1. [Material específico] - Cantidad: [número]
2. [Material específico] - Cantidad: [número]
... (12+ materiales)

RECURSOS DIGITALES (apps, sitios web específicos):
- [App/Sitio]: [descripción y cómo usar]
- [Recurso]: [URL si es posible]
... (mínimo 5 recursos)

LIBROS DE TEXTO SEP (con ISBN y páginas):
- Libro: [Título completo, Grado]
- Páginas: [números específicos]
- Justificación: [por qué estos fragmentos]

RECURSOS TIC Y ADAPTACIONES:
- Software recomendado
- Plataformas digitales
- Aplicaciones móviles

ADAPTACIONES PARA ESTUDIANTES CON NEE:
- Para discapacidad visual: [específico]
- Para discapacidad auditiva: [específico]
- Para dificultades motoras: [específico]
- Para dificultades de aprendizaje: [específico]
- Para estudiantes de alto rendimiento: [ampliaciones]
- Para estudiantes de aprendizaje lento: [apoyo diferenciado]

══════════════════════════════════════════════════════════════════
APARTADO 6 — SECUENCIA DIDÁCTICA COMPLETA (${semanas} SEMANA(S))
══════════════════════════════════════════════════════════════════

PARA CADA DÍA, ESTRUCTURA ESTOS 3 MOMENTOS:

═══════════════════════════════════════════════════════════════
LUNES: [TÍTULO DEL DÍA]
═══════════════════════════════════════════════════════════════

⚡ MOMENTO DE INICIO (15 MINUTOS)
Activación de Saberes Previos:
- Preguntas diagnósticas: [preguntas concretas para saber qué saben]
- Exploración de ideas previas: [actividades cortas]

Detonador o Situación Problema:
- Presenta un dilema, caso, video, o imagen que capte atención
- Genera inquietud y curiosidad

Propósito Explícito de la Sesión:
- Dile al estudiante: "Hoy vamos a... porque..."

⚡ MOMENTO DE DESARROLLO (25 MINUTOS)

Actividad 1 - [Título descriptivo] (8 min):
- Descripción detallada de la actividad
- Recursos necesarios
- Consignas claras para los estudiantes
- Agrupamiento (individual, parejas, triadas, grupal)
- Rol del docente: [andamiaje específico, preguntas, observación]

Actividad 2 - [Título descriptivo] (10 min):
- [Descripción completa]

Actividad 3 - [Título descriptivo] (7 min):
- [Descripción completa]

Estrategias de Enseñanza-Aprendizaje Utilizadas:
- [estrategia 1 y por qué]
- [estrategia 2 y por qué]

Niveles de Complejidad Diferenciados:
- Para estudiantes en proceso: [actividad con apoyo]
- Para estudiantes avanzados: [reto adicional]
- Para estudiantes con dificultades: [simplificación]

⚡ MOMENTO DE CIERRE (10 MINUTOS)

Síntesis de Aprendizajes:
- Técnica: Ejercicio "3-2-1" (3 cosas aprendidas, 2 preguntas, 1 idea)
- O: mapa conceptual colaborativo
- O: poema acrostico con conceptos

Reflexión Metacognitiva:
- "¿Cómo aprendí hoy?"
- "¿Qué me fue fácil/difícil?"
- "¿Para qué me sirve esto?"

Conexión con Próxima Sesión:
- Plantea "el próximo día vamos a..."

[REPETIR ESTRUCTURA PARA MARTES, MIÉRCOLES, JUEVES, VIERNES]

══════════════════════════════════════════════════════════════════
APARTADO 7 — EVALUACIÓN INTEGRAL
══════════════════════════════════════════════════════════════════

EVALUACIÓN DIAGNÓSTICA (Inicio de la unidad):
- Instrumento: [rúbrica, cuestionario, observación, etc.]
- Propósito: [identificar saberes previos]
- Análisis: [cómo interpretar resultados]

EVALUACIÓN FORMATIVA (Durante las sesiones):
- Momento: [cuándo evalúas]
- Instrumento: [lista de cotejo, rúbrica, etc.]
- Indicadores: [qué observar]
- Retroalimentación: [cómo comunicas resultados]

EVALUACIÓN SUMATIVA (Producto final):
- Producto esperado: [proyecto, examen, presentación, etc.]
- Criterios: [rúbrica con 4+ niveles]
- Ponderación: [% de la calificación]

INSTRUMENTOS DE EVALUACIÓN (Incluye ejemplos):

1. RÚBRICA DE DESEMPEÑO:
   Indicador / Insuficiente / En Desarrollo / Proficiente / Excepcional
   [tabla de 4-5 filas x 4 columnas]

2. LISTA DE COTEJO:
   ☐ Criterio 1
   ☐ Criterio 2
   [mínimo 8 criterios]

3. PRUEBA ESCRITA:
   [3-5 preguntas de diferentes tipos: opción múltiple, desarrollo, etc.]

4. AUTOEVALUACIÓN:
   [Preguntas para que el estudiante reflexione sobre su aprendizaje]

5. COEVALUACIÓN:
   [Cómo evalúan los compañeros]

══════════════════════════════════════════════════════════════════
APARTADO 8 — ESTRATEGIAS DE INCLUSIÓN Y DIFERENCIACIÓN
══════════════════════════════════════════════════════════════════

ADAPTACIONES CURRICULARES:

Para Estudiantes con Discapacidad:
- Visual: [materiales en braille, audio, descripciones verbales]
- Auditiva: [intérprete, subtítulos, señas]
- Motora: [ubicación accesible, ajuste de tiempo]
- Intelectual: [contenidos simplificados, apoyos visuales]

Para Estudiantes de Diferentes Ritmos:
- Lento: [materiales de apoyo, repetición, tutoría par]
- Rápido: [retos, profundizaciones, proyectos]

Consideraciones Lingüísticas:
- Estudiantes bilingües: [uso de L1, señas, etc.]
- Estudiantes con dificultades de lenguaje: [apoyos visuales]

Accesibilidad:
- Física: [rampa, baño, agua, luz]
- Digital: [letra grande, contrastes, navegación]
- Emocional: [espacio seguro, respeto]

══════════════════════════════════════════════════════════════════
VALIDACIÓN FINAL — VERIFICA ANTES DE TERMINAR
══════════════════════════════════════════════════════════════════

☐ ¿Usé PDA (Progresiones de Desarrollo) en lugar de "Aprendizajes Esperados"?
☐ ¿Incluí 6-8 PDA claros con indicadores y evidencias?
☐ ¿Mencioné explícitamente el Acuerdo 14/08/22?
☐ ¿Identifiqué y justifiqué todos los Ejes Articuladores relevantes?
☐ ¿Los 5 momentos de inicio-desarrollo-cierre están bien estructurados?
☐ ¿Hay 15,000+ caracteres en total?
☐ ¿Las evaluaciones son diagnóstica + formativa + sumativa?
☐ ¿Incluí adaptaciones para estudiantes con NEE?
☐ ¿Relacioné con Campos Formativos correctamente (NO Asignaturas)?
☐ ¿Hay conexión clara con contexto comunitario/local?
☐ ¿Las preguntas son problematizadoras (no solo descriptivas)?

Si respondiste SÍ a TODO → La planeación cumple normativa NEM 2022
Si respondiste NO a alguno → REVISA ESE APARTADO ANTES DE TERMINAR

══════════════════════════════════════════════════════════════════
FIN DE LA INSTRUCCIÓN
══════════════════════════════════════════════════════════════════

Responde ÚNICAMENTE en español mexicano formal.
No uses lenguaje genérico — sé específico y concreto.
Cada apartado debe estar CLARAMENTE DELIMITADO con líneas separadoras (===).
Prioriza profundidad sobre brevedad.
  `,

  // PLANTILLA DE VALIDACIÓN POR IA
  QUALITY_CHECK: {
    minCharacters: 15000,
    maxCharacters: 30000,
    requiredTerms: [
      'Progresión de Desarrollo',
      'PDA',
      'Acuerdo 14/08/22',
      'Campo Formativo',
      'Ejes Articuladores'
    ],
    forbiddenTerms: [
      'Aprendizaje esperado',
      'Competencias para la vida',
      'Desempeños',
      'Estándares curriculares'
    ],
    requiredSections: [
      'APARTADO 1',
      'APARTADO 2',
      'APARTADO 3',
      'APARTADO 4',
      'APARTADO 5',
      'APARTADO 6',
      'APARTADO 7',
      'APARTADO 8'
    ]
  }
};

// EXPORTAR TAMBIÉN COMO FUNCIÓN PARA INYECTAR VARIABLES
module.exports.generarPromptPlaneacion = (materia, grado, tema, duracion, semanas) => {
  return module.exports.PLANEACION_NEM_2022_PROMPT(materia, grado, tema, duracion, semanas);
};
