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
1. Analiza la idea y detecta qué información falta o es vaga
2. Saluda al usuario de forma amigable y menciona el título de su proyecto
3. Haz 2-3 preguntas clave para entender mejor:
   - ¿Quién es el usuario objetivo?
   - ¿Qué problema específico causa más dolor?
   - ¿Qué competencia existe?
   - ¿Cómo se monetizará?
4. Mantén un tono conversacional y motivador
5. NO respondas preguntas off-topic (matemáticas, clima, etc.). Si el usuario pregunta algo no relacionado, redirígelo amablemente al proyecto

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
1. Analiza la respuesta del usuario
2. Si el usuario da información valiosa, actualiza los campos correspondientes con versiones mejoradas
3. Si el usuario pregunta algo off-topic (ej: "cuánto es 2+2"), responde: "¡Hey! Mantengámonos enfocados en tu proyecto. ¿Qué tal si me cuentas más sobre [aspecto relevante]?"
4. Si la información está completa, sugiere siguiente paso (validar competencia, monetización, etc.)
5. Mantén el tono conversacional y motivador

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
      model: "models/gemini-2.0-flash-exp",
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
1. Saluda al usuario y explica brevemente tu rol
2. Pregunta sobre el contexto del proyecto (tipo de app, usuarios, escala esperada)
3. Haz 2-3 preguntas clave para empezar a levantar requerimientos:
   - ¿Cuáles son las funcionalidades core que el usuario debe poder hacer?
   - ¿Hay requisitos de performance? (usuarios concurrentes, tiempo de respuesta)
   - ¿Qué datos se manejarán y cómo fluyen entre módulos?
4. Mantén un tono profesional pero accesible
5. NO respondas preguntas off-topic, mantén el foco en el análisis técnico

RESPONDE EN FORMATO JSON:
{
  "response": "Tu mensaje conversacional aquí con preguntas específicas"
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
1. Analiza la respuesta del usuario
2. Identifica qué información nueva aporta para cada sección
3. Haz preguntas de seguimiento para profundizar en detalles técnicos
4. Si el usuario da información valiosa, sugiere cómo se vería redactado en el plan
5. Guía hacia la completitud del plan de acción

CRITERIOS DE COMPLETITUD:
- Requerimientos Funcionales: Al menos 5-7 casos de uso bien definidos con actores, pre/post condiciones
- Requerimientos No Funcionales: Performance (tiempos), seguridad (autenticación, HTTPS), escalabilidad (usuarios concurrentes), disponibilidad (uptime)
- Flujo de Lógica de Negocio: Diagrama o descripción textual de los procesos principales con estados y transiciones

RESPONDE EN FORMATO JSON:
{
  "response": "Tu mensaje conversacional con análisis y preguntas de seguimiento"
}

EJEMPLOS DE BUENAS RESPUESTAS:
- "Perfecto, con base en lo que me dices, un requerimiento funcional sería: 'RF-001: El usuario debe poder registrarse con email/contraseña, validación por código de 6 dígitos enviado por email'. ¿Te parece que agregue esto al plan?"
- "Entiendo que esperan 10,000 usuarios concurrentes. Un requerimiento no funcional sería: 'RNF-001: El sistema debe soportar 10,000 usuarios concurrentes con tiempo de respuesta < 200ms en el percentil 95'. ¿Qué tecnologías tienes en mente para lograrlo?"
`.trim();
    }

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash-exp",
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

1. **Requerimientos Funcionales**: Lista numerada (RF-001, RF-002...) de casos de uso principales que el sistema debe cumplir
2. **Requerimientos No Funcionales**: Lista numerada (RNF-001, RNF-002...) con performance, seguridad, escalabilidad, disponibilidad
3. **Flujo de Lógica de Negocio**: Descripción textual de los procesos principales paso a paso

INSTRUCCIONES:
- Sé específico y técnico
- Usa el formato RF-XXX y RNF-XXX
- Define al menos 5 requerimientos funcionales
- Define al menos 4 requerimientos no funcionales
- Describe 2-3 flujos de negocio principales
- Basa todo en la información de la idea
- Si falta información, haz suposiciones razonables basadas en el contexto

RESPONDE EN FORMATO JSON:
{
  "functional_requirements": "RF-001: ...\nRF-002: ...\n...",
  "non_functional_requirements": "RNF-001: ...\nRNF-002: ...\n...",
  "business_logic_flow": "FLUJO 1:\n1. ...\n2. ...\n\nFLUJO 2:\n..."
}
`.trim();

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        functional_requirements: "",
        non_functional_requirements: "",
        business_logic_flow: ""
      };
    }

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

3. **database_schema**: Diseña el esquema completo de la base de datos:
   - Para SQL: Tablas en formato SQL DDL con tipos de datos, PKs, FKs, índices
   - Para NoSQL: Estructura de colecciones/documentos en formato JSON
   - Para Híbrida: Ambos con separación clara

   Incluye al menos 5-7 entidades principales.

4. **entities_relationships**: Describe las entidades principales y sus relaciones:
   - Lista cada entidad con sus atributos clave
   - Define las relaciones (1:1, 1:N, N:M)
   - Explica las reglas de negocio que afectan las relaciones
   - Usa formato de diagrama ER en texto o descripción estructurada

5. **tech_stack**: Recomienda un stack tecnológico completo:
   - **Frontend**: Framework (React/Vue/Angular), State Management, UI Library
   - **Backend**: Lenguaje/Framework (Node.js/Go/Python/Java), API (REST/GraphQL)
   - **Base de Datos**: Sistema específico con versión
   - **Infraestructura**: Cloud (AWS/GCP/Azure), CI/CD, Monitoring
   - **Desarrollo**: Testing, Linting, Package Manager

   Justifica cada elección brevemente.

6. **architecture_pattern**: Recomienda el patrón arquitectónico más apropiado:
   - MVC, Clean Architecture, Hexagonal, Microservicios, Serverless, Event-Driven, etc.

   Explica por qué este patrón es el mejor para este proyecto (4-5 líneas).

7. **system_architecture**: Diseña la arquitectura completa del sistema:
   - Capas de la aplicación y sus responsabilidades
   - Componentes principales y cómo se comunican
   - Flujo de datos (sincrónico/asincrónico)
   - Seguridad: Autenticación, Autorización, Encriptación
   - Escalabilidad: Load Balancing, Caching, CDN
   - Monitoreo y Logging

   Usa formato de diagrama en texto o descripción estructurada detallada.

INSTRUCCIONES IMPORTANTES:
- Sé específico y técnico en cada sección
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
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 8000
      }
    });

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        user_stories: "",
        database_type: "",
        database_schema: "",
        entities_relationships: "",
        tech_stack: "",
        architecture_pattern: "",
        system_architecture: ""
      };
    }

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
- Sé específico y técnico cuando sea necesario
- Justifica tus recomendaciones con razones técnicas
- Considera escalabilidad, mantenibilidad, seguridad y performance
- Adapta tus respuestas al nivel técnico de la pregunta
- Si sugieres cambios, explica el impacto y los beneficios
- Mantén coherencia con las decisiones arquitectónicas previas
- NO respondas preguntas off-topic, enfócate en la arquitectura

Responde de forma clara, profesional y útil.

USUARIO: ${sanitizeForPrompt(message)}

RESPONDE EN FORMATO JSON:
{
  "response": "Tu respuesta conversacional aquí"
}
`.trim();

    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash-exp",
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

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🧩 Ideation, Action Plan & Architecture agent service running on port ${PORT}`);
});
