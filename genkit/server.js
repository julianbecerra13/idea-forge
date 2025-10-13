import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT  = Number(process.env.PORT || 3001);
const TOKEN = process.env.GENKIT_TOKEN || "";
const API_KEY = process.env.GOOGLE_API_KEY;

// Fuerza API v1 (evita v1beta)
const genAI = new GoogleGenerativeAI(API_KEY, {
  apiEndpoint: "https://generativelanguage.googleapis.com/v1",
});

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
      // Primer mensaje: análisis profundo y preguntas clave
      prompt = `
Eres un agente especializado en ideación de proyectos de software. Tu misión es ayudar al usuario a estructurar y mejorar su idea mediante preguntas estratégicas.

IDEA INICIAL:
- Título: "${idea?.title ?? ""}"
- Objetivo: "${idea?.objective ?? ""}"
- Problema: "${idea?.problem ?? ""}"
- Alcance: "${idea?.scope ?? ""}"

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
      // Conversación en curso: analiza respuestas y actualiza campos
      prompt = `
Eres un agente especializado en ideación de proyectos de software.

IDEA ACTUAL:
- Título: "${idea?.title ?? ""}"
- Objetivo: "${idea?.objective ?? ""}"
- Problema: "${idea?.problem ?? ""}"
- Alcance: "${idea?.scope ?? ""}

CONVERSACIÓN PREVIA:
${historyLines}

NUEVO MENSAJE DEL USUARIO: "${message}"

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

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🧩 Ideation agent service running on port ${PORT}`);
});
