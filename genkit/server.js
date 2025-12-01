import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT  = Number(process.env.PORT || 3001);
const TOKEN = process.env.GENKIT_TOKEN || "";
const API_KEY = process.env.GOOGLE_API_KEY;

// Validar API Key al inicio
if (!API_KEY) {
  console.error("FATAL: GOOGLE_API_KEY not set");
  process.exit(1);
}

// Fuerza API v1 (evita v1beta)
const genAI = new GoogleGenerativeAI(API_KEY, {
  apiEndpoint: "https://generativelanguage.googleapis.com/v1",
});

// Función para sanitizar inputs y prevenir prompt injection
function sanitizeForPrompt(text) {
  if (!text) return "";

  return text
    .replace(/["""]/g, "'")    // Reemplazar comillas que pueden romper el prompt
    .replace(/\n/g, " ")       // Eliminar saltos de línea maliciosos
    .substring(0, 5000);       // Limitar longitud máxima
}

// Función para parsear JSON de forma segura (limpia caracteres problemáticos)
function safeParseJSON(text, defaultValue = {}) {
  if (!text) return defaultValue;

  let cleanText = text;

  // Intentar parsear directamente primero
  try {
    return JSON.parse(cleanText);
  } catch (firstErr) {
    // Si falla, intentar limpiar el texto
  }

  // Extraer solo el JSON si hay texto adicional
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  }

  // Limpiar caracteres de control dentro de strings JSON
  // Primero, reemplazar newlines literales dentro de valores de string
  cleanText = cleanText.replace(/:\s*"([^"]*?)"/g, (match, content) => {
    const cleanContent = content
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .replace(/\t/g, '\\t')
      .replace(/[\x00-\x1F\x7F]/g, '');
    return `: "${cleanContent}"`;
  });

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("[safeParseJSON] Parse error after cleanup:", err.message);
    console.error("[safeParseJSON] Text was:", cleanText.substring(0, 200));
    return defaultValue;
  }
}

function checkAuth(req, res, next) {
  if (!TOKEN) return next();
  const h = req.get("Authorization") || "";
  if (h === `Bearer ${TOKEN}`) return next();
  return res.status(401).json({ error: "unauthorized" });
}

app.post("/flows/ideationAgent", checkAuth, async (req, res) => {
  try {
    const { idea, history = [], message = "" } = req.body || {};
    const historyLines = Array.isArray(history)
      ? history.map((m) => `${m.role}: ${m.content}`).join("\n")
      : "";

    // Detectar si es la primera interacción (no hay historial o solo mensaje del sistema)
    const isFirstMessage = history.length === 0 || (history.length === 1 && history[0].role === "system");

    let prompt;

    if (isFirstMessage) {
      // Sanitizar inputs para prevenir prompt injection
      const sanitizedTitle = sanitizeForPrompt(idea?.title);
      const sanitizedObjective = sanitizeForPrompt(idea?.objective);
      const sanitizedProblem = sanitizeForPrompt(idea?.problem);
      const sanitizedScope = sanitizeForPrompt(idea?.scope);

      // Primer mensaje: análisis profundo y preguntas clave
      prompt = `
Eres un agente especializado en ideación de proyectos de software. Tu misión es ayudar al usuario a estructurar y mejorar su idea mediante preguntas estratégicas.

IDEA INICIAL:
- Título: "${sanitizedTitle}"
- Objetivo: "${sanitizedObjective}"
- Problema: "${sanitizedProblem}"
- Alcance: "${sanitizedScope}"

INSTRUCCIONES:
1. **RESPONDE SIEMPRE EN ESPAÑOL** - Toda tu respuesta debe estar en español
2. Analiza la idea y detecta qué información falta o es vaga
3. Saluda al usuario de forma amigable y menciona el título de su proyecto
4. Haz 2-3 preguntas clave para entender mejor:
   - ¿Quién es el usuario objetivo?
   - ¿Qué problema específico causa más dolor?
   - ¿Qué competencia existe?
   - ¿Cómo se monetizará?
5. Mantén un tono conversacional y motivador
6. NO respondas preguntas off-topic (matemáticas, clima, etc.). Si el usuario pregunta algo no relacionado, redirígelo amablemente al proyecto

RESPONDE EN FORMATO JSON:
{
  "reply": "Tu mensaje conversacional aquí",
  "shouldUpdate": false,
  "updates": {},
  "isComplete": false
}
`.trim();
    } else {
      // Sanitizar inputs para prevenir prompt injection
      const sanitizedTitle = sanitizeForPrompt(idea?.title);
      const sanitizedObjective = sanitizeForPrompt(idea?.objective);
      const sanitizedProblem = sanitizeForPrompt(idea?.problem);
      const sanitizedScope = sanitizeForPrompt(idea?.scope);
      const sanitizedMessage = sanitizeForPrompt(message);

      // Conversación en curso: analiza respuestas y actualiza campos
      prompt = `
Eres un agente especializado en ideación de proyectos de software.

IDEA ACTUAL:
- Título: "${sanitizedTitle}"
- Objetivo: "${sanitizedObjective}"
- Problema: "${sanitizedProblem}"
- Alcance: "${sanitizedScope}"

CONVERSACIÓN PREVIA:
${historyLines}

NUEVO MENSAJE DEL USUARIO: "${sanitizedMessage}"

INSTRUCCIONES:
1. **RESPONDE SIEMPRE EN ESPAÑOL** - Toda tu respuesta debe estar en español
2. Analiza la respuesta del usuario
3. Si el usuario da información valiosa, actualiza los campos correspondientes con versiones mejoradas
4. Si el usuario pregunta algo off-topic (ej: "cuánto es 2+2"), responde: "¡Hey! Mantengámonos enfocados en tu proyecto. ¿Qué tal si me cuentas más sobre [aspecto relevante]?"
5. Si la información está completa, sugiere siguiente paso (validar competencia, monetización, etc.)
6. Mantén el tono conversacional y motivador

RESPONDE EN FORMATO JSON:
{
  "reply": "Tu mensaje conversacional aquí",
  "shouldUpdate": true o false,
  "updates": {
    "title": "nuevo título mejorado (solo si aplica)",
    "objective": "objetivo mejorado con más detalle (solo si aplica)",
    "problem": "problema más específico (solo si aplica)",
    "scope": "alcance más claro (solo si aplica)"
  },
  "isComplete": true o false
}

CRITERIOS ESTRICTOS DE COMPLETITUD:
Marca "isComplete": true SOLAMENTE si TODOS estos criterios se cumplen:
1. Título: Descriptivo y específico (no genérico)
2. Objetivo: Tiene métricas o KPIs claros (ej: "reducir en 30%", "llegar a 1000 usuarios")
3. Problema: Menciona usuario objetivo específico Y el dolor que sufre
4. Alcance: Define MVP con al menos 3 funcionalidades concretas Y menciona tecnologías o límites

Si el usuario dice "ya está bien organizado" o similar, evalúa objetivamente los criterios arriba.
Si TODOS se cumplen, marca "isComplete": true y responde: "¡Excelente! Tu idea está bien estructurada. Ya puedes pasar al siguiente paso."
Si NO se cumplen TODOS, mantén "isComplete": false y pide lo que falta específicamente.

FORMATO DE RESPUESTA JSON:
{
  "reply": "Tu mensaje aquí",
  "shouldUpdate": true o false,
  "updates": {"title": "...", "objective": "...", "problem": "...", "scope": "..."},
  "isComplete": true o false
}
`.trim();
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback si no devuelve JSON válido
      parsed = { reply: text, shouldUpdate: false, updates: {} };
    }

    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

// Endpoint para editar una sección específica de una idea
app.post("/ideation/edit-section", checkAuth, async (req, res) => {
  try {
    const { section, message, idea } = req.body || {};

    const sanitizedMessage = sanitizeForPrompt(message);
    const sanitizedTitle = sanitizeForPrompt(idea?.title || "");
    const sanitizedObjective = sanitizeForPrompt(idea?.objective || "");
    const sanitizedProblem = sanitizeForPrompt(idea?.problem || "");
    const sanitizedScope = sanitizeForPrompt(idea?.scope || "");

    const sectionNames = {
      title: "Título",
      objective: "Objetivo",
      problem: "Problema",
      scope: "Alcance"
    };

    const prompt = `
Eres un experto en ideación de proyectos de software.

IDEA ACTUAL:
- Título: "${sanitizedTitle}"
- Objetivo: "${sanitizedObjective}"
- Problema: "${sanitizedProblem}"
- Alcance: "${sanitizedScope}"

El usuario quiere modificar la sección "${sectionNames[section] || section}".

MENSAJE DEL USUARIO: "${sanitizedMessage}"

INSTRUCCIONES:
1. **RESPONDE SIEMPRE EN ESPAÑOL** - Tu respuesta y el contenido actualizado deben estar en español
2. Analiza lo que el usuario quiere cambiar
3. Genera una versión mejorada de la sección "${sectionNames[section] || section}"
4. Responde de forma conversacional explicando los cambios
5. Mantén coherencia con el resto de la idea

RESPONDE EN FORMATO JSON:
{
  "reply": "Tu respuesta conversacional explicando los cambios realizados (EN ESPAÑOL)",
  "updatedSection": "El nuevo contenido mejorado para la sección ${sectionNames[section] || section} (EN ESPAÑOL)"
}
`.trim();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    const parsed = safeParseJSON(text, {
      reply: "Lo siento, hubo un error al procesar tu solicitud.",
      updatedSection: idea?.[section] || ""
    });

    res.json(parsed);
  } catch (e) {
    console.error("[/ideation/edit-section] Error:", e);
    res.status(500).json({ error: String(e) });
  }
});

app.post("/action-plan/chat", checkAuth, async (req, res) => {
  try {
    const { idea_id, message, context = {} } = req.body || {};

    // Sanitizar inputs
    const sanitizedMessage = sanitizeForPrompt(message);
    const sanitizedFuncReq = sanitizeForPrompt(context.functional_requirements || "");
    const sanitizedNonFuncReq = sanitizeForPrompt(context.non_functional_requirements || "");
    const sanitizedBusinessFlow = sanitizeForPrompt(context.business_logic_flow || "");

    // Detectar si es la primera interacción
    const isFirstMessage = !context.functional_requirements && !context.non_functional_requirements && !context.business_logic_flow;

    let prompt;

    if (isFirstMessage) {
      // Primer mensaje: introducción y análisis inicial
      prompt = `
Eres un Analista de Sistemas Senior especializado en levantar requerimientos y diseñar arquitecturas de software.

El usuario ha completado la fase de ideación de su proyecto (ID: ${idea_id}) y ahora necesita crear un Plan de Acción técnico detallado.

Tu misión es ayudarlo a definir:
1. **Requerimientos Funcionales**: Qué debe hacer el sistema (casos de uso, funcionalidades)
2. **Requerimientos No Funcionales**: Performance, seguridad, escalabilidad, disponibilidad
3. **Flujo de Lógica de Negocio**: Diagrama de procesos, reglas de negocio, flujos de datos

MENSAJE DEL USUARIO: "${sanitizedMessage}"

INSTRUCCIONES:
1. **RESPONDE SIEMPRE EN ESPAÑOL** - Toda tu respuesta debe estar en español
2. Saluda al usuario y explica brevemente tu rol
3. Pregunta sobre el contexto del proyecto (tipo de app, usuarios, escala esperada)
4. Haz 2-3 preguntas clave para empezar a levantar requerimientos:
   - ¿Cuáles son las funcionalidades core que el usuario debe poder hacer?
   - ¿Hay requisitos de performance? (usuarios concurrentes, tiempo de respuesta)
   - ¿Qué datos se manejarán y cómo fluyen entre módulos?
5. Mantén un tono profesional pero accesible
6. NO respondas preguntas off-topic, mantén el foco en el análisis técnico

RESPONDE EN FORMATO JSON:
{
  "response": "Tu mensaje conversacional aquí con preguntas específicas (EN ESPAÑOL)"
}
`.trim();
    } else {
      // Conversación en curso: refinar y construir el plan
      prompt = `
Eres un Analista de Sistemas Senior ayudando a crear un Plan de Acción técnico.

CONTEXTO ACTUAL DEL PLAN:
- Requerimientos Funcionales: ${sanitizedFuncReq || "No definidos aún"}
- Requerimientos No Funcionales: ${sanitizedNonFuncReq || "No definidos aún"}
- Flujo de Lógica de Negocio: ${sanitizedBusinessFlow || "No definido aún"}

NUEVO MENSAJE DEL USUARIO: "${sanitizedMessage}"

INSTRUCCIONES:
1. **RESPONDE SIEMPRE EN ESPAÑOL** - Toda tu respuesta debe estar en español
2. Analiza la respuesta del usuario
3. Identifica qué información nueva aporta para cada sección
4. Haz preguntas de seguimiento para profundizar en detalles técnicos
5. Si el usuario da información valiosa, sugiere cómo se vería redactado en el plan
6. Guía hacia la completitud del plan de acción

CRITERIOS DE COMPLETITUD:
- Requerimientos Funcionales: Al menos 5-7 casos de uso bien definidos con actores, pre/post condiciones
- Requerimientos No Funcionales: Performance (tiempos), seguridad (autenticación, HTTPS), escalabilidad (usuarios concurrentes), disponibilidad (uptime)
- Flujo de Lógica de Negocio: Diagrama o descripción textual de los procesos principales con estados y transiciones

RESPONDE EN FORMATO JSON:
{
  "response": "Tu mensaje conversacional con análisis y preguntas de seguimiento"
}

EJEMPLOS DE BUENAS RESPUESTAS:
- "Perfecto, con base en lo que me dices, un requerimiento funcional sería: 'El usuario debe poder registrarse con email/contraseña, validación por código de 6 dígitos enviado por email'. ¿Te parece que agregue esto al plan?"
- "Entiendo que esperan 10,000 usuarios concurrentes. Un requerimiento no funcional sería: 'El sistema debe soportar 10,000 usuarios concurrentes con tiempo de respuesta < 200ms en el percentil 95'. ¿Qué tecnologías tienes en mente para lograrlo?"
`.trim();
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback si no devuelve JSON válido
      parsed = { response: text };
    }

    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

// Endpoint para editar una sección específica del plan de acción CON PROPAGACIÓN
app.post("/action-plan/edit-section", checkAuth, async (req, res) => {
  try {
    const { section, message, idea_context, plan_context } = req.body || {};

    const sanitizedMessage = sanitizeForPrompt(message);

    const sectionNames = {
      functional_requirements: "Requerimientos Funcionales",
      non_functional_requirements: "Requerimientos No Funcionales",
      business_logic_flow: "Flujo de Lógica de Negocio"
    };

    let ideaInfo = "";
    if (idea_context) {
      ideaInfo = `
CONTEXTO DE LA IDEA:
- Título: "${sanitizeForPrompt(idea_context.title || "")}"
- Objetivo: "${sanitizeForPrompt(idea_context.objective || "")}"
- Problema: "${sanitizeForPrompt(idea_context.problem || "")}"
- Alcance: "${sanitizeForPrompt(idea_context.scope || "")}"
`;
    }

    let planInfo = "";
    if (plan_context) {
      planInfo = `
PLAN DE ACCIÓN ACTUAL:
- Requerimientos Funcionales: ${sanitizeForPrompt(plan_context.functional_requirements || "No definidos")}
- Requerimientos No Funcionales: ${sanitizeForPrompt(plan_context.non_functional_requirements || "No definidos")}
- Flujo de Lógica de Negocio: ${sanitizeForPrompt(plan_context.business_logic_flow || "No definido")}
`;
    }

    const prompt = `
Eres un Analista de Sistemas Senior especializado en levantar requerimientos y coherencia de proyectos.
${ideaInfo}
${planInfo}

El usuario quiere modificar la sección "${sectionNames[section] || section}".

MENSAJE DEL USUARIO: "${sanitizedMessage}"

INSTRUCCIONES CRÍTICAS:
1. **RESPONDE SIEMPRE EN ESPAÑOL** - Tu respuesta y todo el contenido generado debe estar en español
2. Analiza el cambio solicitado
3. Genera la sección actualizada con viñetas (- )
4. IMPORTANTE: Detecta si este cambio requiere actualizaciones en:
   - OTRAS secciones de Plan de Acción (ej: si agregas requerimiento funcional, ¿necesita flujo de negocio?)
   - IDEACIÓN (ej: si agregas funcionalidad completamente nueva, ¿debe agregarse al alcance/objetivo?)

5. Para cada cambio nuevo, identifica el TEXTO EXACTO que se agregó (para resaltarlo visualmente)

RESPONDE EN FORMATO JSON:
{
  "reply": "Explicación conversacional de todos los cambios realizados y propagados",
  "updatedSection": "Contenido COMPLETO actualizado de ${sectionNames[section] || section}",
  "addedText": ["texto nuevo 1 que se agregó", "texto nuevo 2"],
  "propagation": {
    "action_plan": {
      "functional_requirements": {
        "content": null,
        "addedText": []
      },
      "non_functional_requirements": {
        "content": null,
        "addedText": []
      },
      "business_logic_flow": {
        "content": null,
        "addedText": []
      }
    },
    "ideation": {
      "scope": {
        "content": "Contenido completo actualizado (o null si no aplica)",
        "addedText": ["texto nuevo agregado"]
      },
      "objective": {
        "content": null,
        "addedText": []
      },
      "problem": {
        "content": null,
        "addedText": []
      }
    }
  }
}

REGLAS DE PROPAGACIÓN:
- Solo propaga si es REALMENTE necesario para mantener coherencia
- Si agregas un requerimiento funcional de algo NUEVO que no está en el alcance de la idea, actualiza la idea
- El "content" debe ser el contenido COMPLETO de esa sección (no solo lo nuevo)
- "addedText" son los fragmentos exactos que se agregaron (para resaltarlos en verde)
- Usa null en "content" si esa sección NO necesita cambios
`.trim();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 4000
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    const parsed = safeParseJSON(text, {
      reply: "Lo siento, hubo un error al procesar tu solicitud.",
      updatedSection: plan_context?.[section] || "",
      addedText: [],
      propagation: {
        action_plan: {},
        ideation: {}
      }
    });

    res.json(parsed);
  } catch (e) {
    console.error("[/action-plan/edit-section] Error:", e);
    res.status(500).json({ error: String(e) });
  }
});

app.post("/action-plan/generate-initial", checkAuth, async (req, res) => {
  try {
    const { idea } = req.body || {};

    if (!idea) {
      return res.status(400).json({ error: "idea is required" });
    }

    // Sanitizar inputs (Go usa PascalCase en JSON)
    const sanitizedTitle = sanitizeForPrompt(idea.Title || idea.title || "");
    const sanitizedObjective = sanitizeForPrompt(idea.Objective || idea.objective || "");
    const sanitizedProblem = sanitizeForPrompt(idea.Problem || idea.problem || "");
    const sanitizedScope = sanitizeForPrompt(idea.Scope || idea.scope || "");

    const prompt = `
Eres un Analista de Sistemas Senior. Tienes la siguiente idea de proyecto completada:

IDEA:
- Título: "${sanitizedTitle}"
- Objetivo: "${sanitizedObjective}"
- Problema: "${sanitizedProblem}"
- Alcance: "${sanitizedScope}"

Tu tarea es generar un Plan de Acción técnico inicial con 3 secciones:

1. **Requerimientos Funcionales**: Lista con viñetas de casos de uso principales que el sistema debe cumplir
2. **Requerimientos No Funcionales**: Lista con viñetas de requisitos de performance, seguridad, escalabilidad, disponibilidad
3. **Flujo de Lógica de Negocio**: Descripción textual de los procesos principales paso a paso

INSTRUCCIONES:
- **RESPONDE SIEMPRE EN ESPAÑOL** - Todo el contenido debe estar en español
- Sé específico y técnico
- Usa viñetas con guiones (- ) para cada requerimiento
- Define al menos 5 requerimientos funcionales
- Define al menos 4 requerimientos no funcionales
- Describe 2-3 flujos de negocio principales
- Basa todo en la información de la idea
- Si falta información, haz suposiciones razonables basadas en el contexto

RESPONDE EN FORMATO JSON:
{
  "functional_requirements": "- El usuario puede registrarse...\n- El sistema permite...\n...",
  "non_functional_requirements": "- El sistema debe responder en menos de 200ms\n- La aplicación debe soportar...\n...",
  "business_logic_flow": "FLUJO 1: Registro de usuario\n1. ...\n2. ...\n\nFLUJO 2: ...\n..."
}

IMPORTANTE: Todo el contenido generado DEBE estar en español.
`.trim();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    const parsed = safeParseJSON(text, {
      functional_requirements: "",
      non_functional_requirements: "",
      business_logic_flow: ""
    });

    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.post("/architecture/generate-initial", checkAuth, async (req, res) => {
  try {
    const { action_plan, idea } = req.body || {};

    // Construir contexto desde la idea
    let ideaContext = "";
    if (idea) {
      ideaContext = `
IDEA ORIGINAL:
- Título: ${sanitizeForPrompt(idea.Title || idea.title || "")}
- Objetivo: ${sanitizeForPrompt(idea.Objective || idea.objective || "")}
- Problema: ${sanitizeForPrompt(idea.Problem || idea.problem || "")}
- Alcance: ${sanitizeForPrompt(idea.Scope || idea.scope || "")}
`;
    }

    // Construir contexto desde el action plan
    let actionPlanContext = "";
    if (action_plan) {
      actionPlanContext = `
PLAN DE ACCIÓN:
- Requerimientos Funcionales: ${sanitizeForPrompt(action_plan.functional_requirements || "")}
- Requerimientos No Funcionales: ${sanitizeForPrompt(action_plan.non_functional_requirements || "")}
- Flujo de Lógica de Negocio: ${sanitizeForPrompt(action_plan.business_logic_flow || "")}
- Tecnologías Propuestas: ${sanitizeForPrompt(action_plan.technologies || "")}
- Riesgos: ${sanitizeForPrompt(action_plan.risks || "")}
- Timeline: ${sanitizeForPrompt(action_plan.timeline || "")}
`;
    }

    const prompt = `
Eres un Arquitecto de Software Senior experto en diseño de sistemas y bases de datos.

${ideaContext}
${actionPlanContext}

Tu tarea es generar una arquitectura técnica completa con las siguientes 7 secciones:

1. **user_stories**: Genera 8-12 historias de usuario en formato "Como [rol], quiero [acción], para [beneficio]". Numera cada historia (US-001, US-002, etc). Basa las historias en los requerimientos funcionales.

2. **database_type**: Analiza los requerimientos y recomienda el tipo de base de datos:
   - "Relacional (PostgreSQL/MySQL)" si requiere transacciones ACID, relaciones complejas
   - "NoSQL (MongoDB/Firestore)" si requiere flexibilidad, escalabilidad horizontal
   - "Híbrida (SQL + NoSQL)" si combina ambas necesidades

   Justifica brevemente tu elección (2-3 líneas).

3. **database_schema**: Diseña el esquema completo de la base de datos.
   IMPORTANTE: Este contenido es para personas NO técnicas, así que SIEMPRE incluye:

   a) PRIMERO una explicación en lenguaje simple de qué es cada tabla/colección y para qué sirve
   b) LUEGO el código técnico (SQL DDL o JSON)

   Formato requerido:
   """
   ## Explicación del Esquema

   El sistema necesita guardar información en las siguientes tablas:

   - **usuarios**: Guarda la información de cada persona registrada (nombre, email, contraseña encriptada)
   - **productos**: Almacena los productos disponibles (nombre, precio, descripción, stock)
   - **ordenes**: Registra cada compra realizada (quién compró, cuándo, total)
   [etc...]

   ## Esquema Técnico

   [Aquí el código SQL o JSON]
   """

4. **entities_relationships**: Describe las entidades principales y sus relaciones.
   IMPORTANTE: Este contenido es para personas NO técnicas, así que SIEMPRE:

   a) Explica cada entidad en lenguaje simple (qué representa, qué datos guarda)
   b) Explica las relaciones de forma entendible (ej: "Un usuario puede tener muchos pedidos, pero cada pedido pertenece a un solo usuario")
   c) Usa analogías del mundo real cuando sea útil

   Formato requerido:
   """
   ## ¿Qué información maneja el sistema?

   ### Usuario
   Representa a cada persona que usa la aplicación. Guardamos su nombre, email y contraseña (encriptada por seguridad).

   ### Producto
   Cada artículo que se puede comprar. Tiene nombre, descripción, precio y cuántas unidades hay disponibles.

   [etc...]

   ## ¿Cómo se relacionan entre sí?

   - Un **usuario** puede hacer muchas **compras** (relación 1 a muchos)
   - Cada **compra** puede incluir varios **productos** (relación muchos a muchos)
   [etc...]

   ## Diagrama de Relaciones (formato texto)

   Usuario (1) ----< (N) Ordenes
   Ordenes (N) >----< (N) Productos
   [etc...]
   """

5. **tech_stack**: Recomienda un stack tecnológico completo:
   - **Frontend**: Framework (React/Vue/Angular), State Management, UI Library
   - **Backend**: Lenguaje/Framework (Node.js/Go/Python/Java), API (REST/GraphQL)
   - **Base de Datos**: Sistema específico con versión
   - **Infraestructura**: Cloud (AWS/GCP/Azure), CI/CD, Monitoring
   - **Desarrollo**: Testing, Linting, Package Manager

   Para cada tecnología, explica brevemente POR QUÉ se eligió y qué problema resuelve.

6. **architecture_pattern**: Recomienda el patrón arquitectónico más apropiado:
   - MVC, Clean Architecture, Hexagonal, Microservicios, Serverless, Event-Driven, etc.

   Explica:
   - Qué es este patrón en términos simples
   - Por qué es el mejor para este proyecto
   - Beneficios concretos que aporta

7. **system_architecture**: Diseña la arquitectura completa del sistema.
   IMPORTANTE: Incluye explicaciones para no técnicos:

   a) Primero explica la arquitectura de forma simple (como explicarías a alguien sin conocimientos técnicos)
   b) Luego los detalles técnicos para desarrolladores

   Formato requerido:
   """
   ## Visión General (explicación simple)

   El sistema funciona como [analogía simple]. Tiene las siguientes partes principales:
   - El **frontend** es lo que el usuario ve y usa (la aplicación web/móvil)
   - El **backend** es el cerebro que procesa las peticiones
   - La **base de datos** es donde se guarda toda la información
   [etc...]

   ## Arquitectura Técnica Detallada

   ### Capas de la Aplicación
   [Detalles técnicos...]

   ### Seguridad
   [Detalles técnicos...]
   """

INSTRUCCIONES IMPORTANTES:
- **RESPONDE SIEMPRE EN ESPAÑOL** - Todo el contenido debe estar en español
- Sé específico y técnico, pero SIEMPRE incluye explicaciones para no técnicos
- Basa tus decisiones en los requerimientos del plan de acción
- Usa mejores prácticas de la industria
- Piensa en escalabilidad, seguridad y mantenibilidad
- Genera contenido listo para implementar

RESPONDE ÚNICAMENTE EN FORMATO JSON:
{
  "user_stories": "US-001: Como...\nUS-002: Como...\n...",
  "database_type": "Tipo recomendado con justificación",
  "database_schema": "Esquema detallado en SQL DDL o JSON",
  "entities_relationships": "Descripción detallada de entidades y relaciones",
  "tech_stack": "Frontend:\n- ...\nBackend:\n- ...\n...",
  "architecture_pattern": "Patrón recomendado con justificación",
  "system_architecture": "Descripción detallada de la arquitectura del sistema"
}
`.trim();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 8000
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    const parsed = safeParseJSON(text, {
      user_stories: "",
      database_type: "",
      database_schema: "",
      entities_relationships: "",
      tech_stack: "",
      architecture_pattern: "",
      system_architecture: ""
    });

    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.post("/architecture/chat", checkAuth, async (req, res) => {
  try {
    const { message, architecture, action_plan, idea } = req.body || {};

    // Construir contexto de la idea
    let ideaContext = "";
    if (idea) {
      ideaContext = `
**IDEA ORIGINAL:**
- Título: ${sanitizeForPrompt(idea.Title || idea.title || "")}
- Objetivo: ${sanitizeForPrompt(idea.Objective || idea.objective || "")}
- Problema: ${sanitizeForPrompt(idea.Problem || idea.problem || "")}
- Alcance: ${sanitizeForPrompt(idea.Scope || idea.scope || "")}
`;
    }

    // Construir contexto del action plan
    let actionPlanContext = "";
    if (action_plan) {
      actionPlanContext = `
**PLAN DE ACCIÓN:**
- Requerimientos Funcionales: ${sanitizeForPrompt(action_plan.functional_requirements || "No definidos")}
- Requerimientos No Funcionales: ${sanitizeForPrompt(action_plan.non_functional_requirements || "No definidos")}
- Tecnologías: ${sanitizeForPrompt(action_plan.technologies || "No definidas")}
`;
    }

    // Construir contexto de la arquitectura actual
    let architectureContext = "";
    if (architecture) {
      if (architecture.user_stories) {
        architectureContext += `\n**Historias de Usuario:**\n${sanitizeForPrompt(architecture.user_stories)}`;
      }
      if (architecture.database_type) {
        architectureContext += `\n**Tipo de Base de Datos:**\n${sanitizeForPrompt(architecture.database_type)}`;
      }
      if (architecture.database_schema) {
        architectureContext += `\n**Esquema de BD:**\n${sanitizeForPrompt(architecture.database_schema)}`;
      }
      if (architecture.tech_stack) {
        architectureContext += `\n**Stack Tecnológico:**\n${sanitizeForPrompt(architecture.tech_stack)}`;
      }
      if (architecture.architecture_pattern) {
        architectureContext += `\n**Patrón de Arquitectura:**\n${sanitizeForPrompt(architecture.architecture_pattern)}`;
      }
    }

    const systemPrompt = `
Eres un Arquitecto de Software Senior experto en diseño de sistemas, bases de datos y patrones arquitectónicos.

${ideaContext}
${actionPlanContext}

**ARQUITECTURA ACTUAL DEL SISTEMA:**
${architectureContext || "La arquitectura aún no tiene contenido generado."}

Tu rol es:
1. Ayudar a refinar y mejorar la arquitectura del sistema
2. Responder preguntas sobre decisiones arquitectónicas
3. Sugerir mejoras basadas en mejores prácticas
4. Explicar conceptos arquitectónicos de forma clara
5. Ayudar a resolver problemas de diseño
6. Recomendar patrones y tecnologías apropiadas

**Reglas importantes:**
- **RESPONDE SIEMPRE EN ESPAÑOL** - Toda tu respuesta debe estar en español
- Sé específico y técnico cuando sea necesario
- Justifica tus recomendaciones con razones técnicas
- Considera escalabilidad, mantenibilidad, seguridad y performance
- Adapta tus respuestas al nivel técnico de la pregunta
- Si sugieres cambios, explica el impacto y los beneficios
- Mantén coherencia con las decisiones arquitectónicas previas
- NO respondas preguntas off-topic, enfócate en la arquitectura
- Si incluyes código o esquemas, SIEMPRE acompáñalos de una explicación en lenguaje simple

Responde de forma clara, profesional y útil.

USUARIO: ${sanitizeForPrompt(message)}

RESPONDE EN FORMATO JSON:
{
  "response": "Tu respuesta conversacional aquí"
}
`.trim();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 2000
      }
    });

    const result = await model.generateContent(systemPrompt);
    const text = result?.response?.text?.() ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { response: text };
    }

    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

// Endpoint para editar una sección específica de la arquitectura CON PROPAGACIÓN
app.post("/architecture/edit-section", checkAuth, async (req, res) => {
  try {
    const { section, message, idea_context, plan_context, architecture_context } = req.body || {};

    const sanitizedMessage = sanitizeForPrompt(message);

    const sectionNames = {
      user_stories: "Historias de Usuario",
      database_type: "Tipo de Base de Datos",
      database_schema: "Esquema de Base de Datos",
      entities_relationships: "Entidades y Relaciones",
      tech_stack: "Stack Tecnológico",
      architecture_pattern: "Patrón de Arquitectura",
      system_architecture: "Arquitectura del Sistema"
    };

    let context = "";
    if (idea_context) {
      context += `
IDEA ORIGINAL:
- Título: "${sanitizeForPrompt(idea_context.title || "")}"
- Objetivo: "${sanitizeForPrompt(idea_context.objective || "")}"
- Problema: "${sanitizeForPrompt(idea_context.problem || "")}"
- Alcance: "${sanitizeForPrompt(idea_context.scope || "")}"
`;
    }

    if (plan_context) {
      context += `
PLAN DE ACCIÓN ACTUAL:
- Requerimientos Funcionales: ${sanitizeForPrompt(plan_context.functional_requirements || "No definidos")}
- Requerimientos No Funcionales: ${sanitizeForPrompt(plan_context.non_functional_requirements || "No definidos")}
- Flujo de Lógica de Negocio: ${sanitizeForPrompt(plan_context.business_logic_flow || "No definido")}
`;
    }

    if (architecture_context) {
      context += `
ARQUITECTURA ACTUAL:
- Historias de Usuario: ${sanitizeForPrompt(architecture_context.user_stories || "No definidas")}
- Tipo BD: ${sanitizeForPrompt(architecture_context.database_type || "No definido")}
- Esquema BD: ${sanitizeForPrompt(architecture_context.database_schema || "No definido")}
- Entidades: ${sanitizeForPrompt(architecture_context.entities_relationships || "No definidas")}
- Stack: ${sanitizeForPrompt(architecture_context.tech_stack || "No definido")}
- Patrón: ${sanitizeForPrompt(architecture_context.architecture_pattern || "No definido")}
- Arquitectura Sistema: ${sanitizeForPrompt(architecture_context.system_architecture || "No definida")}
`;
    }

    const prompt = `
Eres un Arquitecto de Software Senior experto en diseño de sistemas y coherencia de proyectos.
${context}

El usuario quiere modificar la sección "${sectionNames[section] || section}".

MENSAJE DEL USUARIO: "${sanitizedMessage}"

INSTRUCCIONES CRÍTICAS:
1. **RESPONDE SIEMPRE EN ESPAÑOL** - Tu respuesta y todo el contenido generado debe estar en español
2. Analiza el cambio solicitado
3. Genera la sección actualizada
4. IMPORTANTE: Detecta si este cambio requiere actualizaciones en:
   - OTRAS secciones de Arquitectura (ej: si agregas historia de usuario, ¿necesita cambios en BD, entidades, etc.?)
   - PLAN DE ACCIÓN (ej: si agregas funcionalidad nueva, ¿falta el requerimiento funcional?)
   - IDEACIÓN (ej: si es algo completamente nuevo, ¿debe agregarse al alcance?)

5. Para cada cambio nuevo, identifica el TEXTO EXACTO que se agregó (para resaltarlo visualmente)

6. **PARA SECCIONES TÉCNICAS** (database_schema, entities_relationships, system_architecture):
   - SIEMPRE incluye una explicación en lenguaje simple ANTES del código técnico
   - Explica qué hace cada tabla/entidad/componente para que alguien sin conocimientos técnicos lo entienda
   - Usa analogías del mundo real cuando sea útil

RESPONDE EN FORMATO JSON:
{
  "reply": "Explicación conversacional de todos los cambios realizados y propagados",
  "updatedSection": "Contenido COMPLETO actualizado de ${sectionNames[section] || section}",
  "addedText": ["texto nuevo 1 que se agregó", "texto nuevo 2"],
  "propagation": {
    "architecture": {
      "database_schema": {
        "content": "Contenido completo actualizado (o null si no aplica)",
        "addedText": ["texto nuevo agregado aquí"]
      },
      "entities_relationships": {
        "content": null,
        "addedText": []
      },
      "tech_stack": {
        "content": null,
        "addedText": []
      },
      "system_architecture": {
        "content": null,
        "addedText": []
      }
    },
    "action_plan": {
      "functional_requirements": {
        "content": "Contenido completo actualizado (o null si no aplica)",
        "addedText": ["texto nuevo agregado"]
      },
      "non_functional_requirements": {
        "content": null,
        "addedText": []
      },
      "business_logic_flow": {
        "content": null,
        "addedText": []
      }
    },
    "ideation": {
      "scope": {
        "content": null,
        "addedText": []
      },
      "objective": {
        "content": null,
        "addedText": []
      }
    }
  }
}

REGLAS DE PROPAGACIÓN:
- Solo propaga si es REALMENTE necesario para mantener coherencia
- Si agregas historia de usuario de algo NUEVO, DEBE existir el requerimiento funcional correspondiente
- Si agregas entidad/tabla nueva, actualiza schema Y entidades
- El "content" debe ser el contenido COMPLETO de esa sección (no solo lo nuevo)
- "addedText" son los fragmentos exactos que se agregaron (para resaltarlos en verde)
- Usa null en "content" si esa sección NO necesita cambios
`.trim();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 8000
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    const parsed = safeParseJSON(text, {
      reply: "Lo siento, hubo un error al procesar tu solicitud.",
      updatedSection: architecture_context?.[section] || "",
      addedText: [],
      propagation: {
        architecture: {},
        action_plan: {},
        ideation: {}
      }
    });

    res.json(parsed);
  } catch (e) {
    console.error("[/architecture/edit-section] Error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// Endpoint para mejorar la idea inicial (cuando se crea una nueva idea)
app.post("/ideation/improve-initial", checkAuth, async (req, res) => {
  try {
    const { title, objective, problem, scope } = req.body || {};

    // Sanitizar inputs
    const sanitizedTitle = sanitizeForPrompt(title || "");
    const sanitizedObjective = sanitizeForPrompt(objective || "");
    const sanitizedProblem = sanitizeForPrompt(problem || "");
    const sanitizedScope = sanitizeForPrompt(scope || "");

    const prompt = `
Eres un experto en ideación de proyectos de software. El usuario ha creado una nueva idea con información básica.

IDEA INICIAL:
- Título: "${sanitizedTitle}"
- Objetivo: "${sanitizedObjective || "No especificado"}"
- Problema: "${sanitizedProblem || "No especificado"}"
- Alcance: "${sanitizedScope || "No especificado"}"

Tu tarea es MEJORAR y EXPANDIR cada campo con información más detallada y estructurada:

1. **Título**: Si es muy corto o genérico, hazlo más descriptivo. Si ya es bueno, mantenlo igual.

2. **Objetivo**: Expande el objetivo con:
   - Propósito claro del sistema
   - Métricas de éxito (si aplica)
   - Valor que aporta al usuario

3. **Problema**: Detalla el problema con:
   - El dolor específico que resuelve
   - Quién sufre este problema
   - Consecuencias de no resolverlo

4. **Alcance**: Define el alcance con:
   - Funcionalidades core del MVP
   - Límites claros (qué NO incluye)
   - Usuarios objetivo

IMPORTANTE:
- **RESPONDE SIEMPRE EN ESPAÑOL** - Todo el contenido debe estar en español
- Mantén la esencia de la idea original
- Sé específico pero conciso (2-4 oraciones por campo)
- Si un campo está vacío, genera contenido basándote en el título

RESPONDE ÚNICAMENTE EN FORMATO JSON (EN ESPAÑOL):
{
  "title": "Título mejorado",
  "objective": "Objetivo expandido con detalles",
  "problem": "Problema detallado con contexto",
  "scope": "Alcance claro con funcionalidades"
}
`.trim();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    let parsed = safeParseJSON(text, {
      title: title || "",
      objective: objective || "",
      problem: problem || "",
      scope: scope || ""
    });

    // Si Gemini devuelve un array, extraer el primer elemento
    if (Array.isArray(parsed)) {
      parsed = parsed[0] || {
        title: title || "",
        objective: objective || "",
        problem: problem || "",
        scope: scope || ""
      };
    }

    res.json(parsed);
  } catch (e) {
    console.error("[/ideation/improve-initial] Error:", e);
    res.status(500).json({ error: String(e) });
  }
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🧩 Ideation, Action Plan & Architecture agent service running on port ${PORT}`);
});
