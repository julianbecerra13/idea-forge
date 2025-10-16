import { genkit, z } from "genkit";
import { gemini20FlashExp } from "@genkit-ai/googleai";

const ai = genkit({
  plugins: [],
  model: gemini20FlashExp,
});

// Schema para el contexto del action plan
const ActionPlanSchema = z.object({
  id: z.string(),
  idea_id: z.string(),
  functional_requirements: z.string().optional().nullable(),
  non_functional_requirements: z.string().optional().nullable(),
  technologies: z.string().optional().nullable(),
  risks: z.string().optional().nullable(),
  timeline: z.string().optional().nullable(),
  completed: z.boolean().optional(),
});

// Schema para el contexto de la idea
const IdeaSchema = z.object({
  ID: z.string(),
  Title: z.string(),
  Objective: z.string(),
  Problem: z.string(),
  Scope: z.string(),
});

// Generar contenido inicial de arquitectura
export const generateInitialArchitecture = ai.defineFlow(
  {
    name: "generateInitialArchitecture",
    inputSchema: z.object({
      architecture_id: z.string(),
      action_plan: ActionPlanSchema.nullable(),
      idea: IdeaSchema.nullable(),
    }),
    outputSchema: z.object({
      user_stories: z.string(),
      database_type: z.string(),
      database_schema: z.string(),
      entities_relationships: z.string(),
      tech_stack: z.string(),
      architecture_pattern: z.string(),
      system_architecture: z.string(),
    }),
  },
  async ({ architecture_id, action_plan, idea }) => {
    const context = buildContext(idea, action_plan);

    const prompt = `Eres un arquitecto de software experto. Basándote en el siguiente proyecto, genera una arquitectura completa.

${context}

Tu tarea es crear:

1. **User Stories (Historias de Usuario)**: Convierte los requerimientos funcionales en historias de usuario siguiendo el formato "Como [rol], quiero [funcionalidad], para [beneficio]". Genera entre 8-12 historias de usuario bien estructuradas y priorizadas.

2. **Tipo de Base de Datos**: Analiza los requerimientos y recomienda el tipo de base de datos más apropiado:
   - Relacional (SQL): Para datos estructurados, transacciones ACID, relaciones complejas
   - NoSQL: Para datos no estructurados, escalabilidad horizontal, flexibilidad de esquema
   - Híbrida: Combina ambas según las necesidades específicas

   Justifica tu elección basándote en los requerimientos del proyecto.

3. **Esquema de Base de Datos**: Diseña el esquema de base de datos completo:
   - Para SQL: Tablas, columnas con tipos de datos, claves primarias/foráneas, índices
   - Para NoSQL: Colecciones/documentos, estructura de datos, estrategias de indexación
   - Para Híbrida: Especifica qué datos van en cada sistema y por qué

   Presenta el esquema en formato que sea fácil de implementar (SQL DDL, JSON schema, etc).

4. **Entidades y Relaciones**: Describe las entidades principales del sistema y sus relaciones. Incluye:
   - Entidades de dominio con sus atributos principales
   - Relaciones entre entidades (uno a uno, uno a muchos, muchos a muchos)
   - Reglas de negocio que afectan las relaciones
   - Considera usar formato de diagrama ER en texto o Mermaid

5. **Stack Tecnológico**: Recomienda un stack tecnológico completo:
   - Frontend: Framework/biblioteca, state management, UI libraries
   - Backend: Lenguaje, framework, APIs (REST/GraphQL)
   - Base de datos: Sistema específico (PostgreSQL, MongoDB, Redis, etc)
   - Infraestructura: Hosting, CI/CD, monitoreo
   - Herramientas de desarrollo

   Justifica cada elección basándote en los requerimientos del proyecto.

6. **Patrón de Arquitectura**: Recomienda el patrón arquitectónico más apropiado:
   - MVC (Model-View-Controller)
   - Clean Architecture
   - Hexagonal Architecture
   - Microservicios
   - Serverless
   - Event-Driven
   - Otros patrones relevantes

   Explica por qué este patrón es el más adecuado para este proyecto.

7. **Arquitectura del Sistema**: Diseña la arquitectura completa del sistema:
   - Diagrama de componentes principales
   - Capas de la aplicación y responsabilidades
   - Flujo de datos entre componentes
   - Patrones de comunicación (sincrónica/asincrónica)
   - Estrategias de seguridad, autenticación y autorización
   - Consideraciones de escalabilidad y rendimiento
   - Puede usar diagramas en texto, Mermaid, o descripciones detalladas

**IMPORTANTE**:
- Sé específico y detallado en cada sección
- Basa tus decisiones en los requerimientos funcionales y no funcionales
- Considera las mejores prácticas de la industria
- Piensa en escalabilidad, mantenibilidad y seguridad
- Genera contenido listo para ser implementado

Responde ÚNICAMENTE con un JSON en este formato exacto:
{
  "user_stories": "...",
  "database_type": "...",
  "database_schema": "...",
  "entities_relationships": "...",
  "tech_stack": "...",
  "architecture_pattern": "...",
  "system_architecture": "..."
}`;

    const result = await ai.generate({
      model: gemini20FlashExp,
      prompt: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8000,
      },
      output: {
        format: "json",
        schema: z.object({
          user_stories: z.string(),
          database_type: z.string(),
          database_schema: z.string(),
          entities_relationships: z.string(),
          tech_stack: z.string(),
          architecture_pattern: z.string(),
          system_architecture: z.string(),
        }),
      },
    });

    return result.output;
  }
);

// Chat interactivo con el arquitecto
export const architectureChat = ai.defineFlow(
  {
    name: "architectureChat",
    inputSchema: z.object({
      architecture_id: z.string(),
      message: z.string(),
      architecture: z.object({
        user_stories: z.string().optional().nullable(),
        database_type: z.string().optional().nullable(),
        database_schema: z.string().optional().nullable(),
        entities_relationships: z.string().optional().nullable(),
        tech_stack: z.string().optional().nullable(),
        architecture_pattern: z.string().optional().nullable(),
        system_architecture: z.string().optional().nullable(),
      }),
      action_plan: ActionPlanSchema.nullable(),
      idea: IdeaSchema.nullable(),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async ({ architecture_id, message, architecture, action_plan, idea }) => {
    const context = buildContext(idea, action_plan);
    const architectureContext = buildArchitectureContext(architecture);

    const systemPrompt = `Eres un arquitecto de software senior experto en diseño de sistemas, bases de datos y patrones arquitectónicos.

**Contexto del Proyecto:**
${context}

**Estado Actual de la Arquitectura:**
${architectureContext}

Tu rol es:
1. Ayudar a refinar y mejorar la arquitectura del sistema
2. Responder preguntas sobre decisiones arquitectónicas
3. Sugerir mejoras basadas en mejores prácticas
4. Explicar conceptos arquitectónicos de forma clara
5. Ayudar a resolver problemas de diseño
6. Recomendar patrones y tecnologías apropiadas

**Reglas importantes:**
- Sé específico y técnico cuando sea necesario
- Justifica tus recomendaciones
- Considera escalabilidad, mantenibilidad y seguridad
- Adapta tus respuestas al nivel técnico de la pregunta
- Si sugiere cambios, explica el impacto y los beneficios
- Mantén coherencia con las decisiones arquitectónicas previas

Responde de forma clara, profesional y útil.`;

    const result = await ai.generate({
      model: gemini20FlashExp,
      prompt: `${systemPrompt}\n\nUsuario: ${message}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    return {
      response: result.text,
    };
  }
);

// Función auxiliar para construir contexto
function buildContext(idea, actionPlan) {
  let context = "";

  if (idea) {
    context += `**Idea Original:**
- Título: ${idea.Title}
- Objetivo: ${idea.Objective}
- Problema a Resolver: ${idea.Problem}
- Alcance: ${idea.Scope}
`;
  }

  if (actionPlan) {
    context += `\n**Plan de Acción:**
`;
    if (actionPlan.functional_requirements) {
      context += `- Requerimientos Funcionales:\n${actionPlan.functional_requirements}\n`;
    }
    if (actionPlan.non_functional_requirements) {
      context += `- Requerimientos No Funcionales:\n${actionPlan.non_functional_requirements}\n`;
    }
    if (actionPlan.technologies) {
      context += `- Tecnologías Propuestas:\n${actionPlan.technologies}\n`;
    }
    if (actionPlan.risks) {
      context += `- Riesgos Identificados:\n${actionPlan.risks}\n`;
    }
    if (actionPlan.timeline) {
      context += `- Timeline:\n${actionPlan.timeline}\n`;
    }
  }

  return context || "No hay contexto disponible del proyecto anterior.";
}

function buildArchitectureContext(architecture) {
  let context = "";

  if (architecture.user_stories) {
    context += `**Historias de Usuario:**\n${architecture.user_stories}\n\n`;
  }
  if (architecture.database_type) {
    context += `**Tipo de Base de Datos:**\n${architecture.database_type}\n\n`;
  }
  if (architecture.database_schema) {
    context += `**Esquema de Base de Datos:**\n${architecture.database_schema}\n\n`;
  }
  if (architecture.entities_relationships) {
    context += `**Entidades y Relaciones:**\n${architecture.entities_relationships}\n\n`;
  }
  if (architecture.tech_stack) {
    context += `**Stack Tecnológico:**\n${architecture.tech_stack}\n\n`;
  }
  if (architecture.architecture_pattern) {
    context += `**Patrón de Arquitectura:**\n${architecture.architecture_pattern}\n\n`;
  }
  if (architecture.system_architecture) {
    context += `**Arquitectura del Sistema:**\n${architecture.system_architecture}\n\n`;
  }

  return context || "La arquitectura aún no tiene contenido generado.";
}

export default ai;
