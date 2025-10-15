# 📐 Documentación Técnica del Backend - Idea Forge

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Servicio Backend (Go)](#servicio-backend-go)
4. [Servicio Genkit (Agente IA)](#servicio-genkit-agente-ia)
5. [Base de Datos PostgreSQL](#base-de-datos-postgresql)
6. [Flujos de Datos Completos](#flujos-de-datos-completos)
7. [API Reference](#api-reference)
8. [Diagramas de Secuencia](#diagramas-de-secuencia)

---

## Visión General

Idea Forge utiliza una **arquitectura de 3 capas** con servicios independientes que se comunican vía HTTP:

```
┌─────────────┐      HTTP      ┌──────────────┐      HTTP      ┌─────────────┐
│   Frontend  │ ◄─────────────► │  Backend Go  │ ◄─────────────► │   Genkit    │
│  Next.js    │   :8080         │  Clean Arch  │   :3001        │  AI Agent   │
└─────────────┘                 └──────┬───────┘                 └─────────────┘
                                       │
                                       │ SQL
                                       ▼
                                ┌──────────────┐
                                │  PostgreSQL  │
                                │    :5432     │
                                └──────────────┘
```

### Puertos de Servicios

- **Frontend**: `localhost:3000` (Next.js)
- **Backend API**: `localhost:8080` (Go)
- **Genkit Agent**: `localhost:3001` (Node.js + Express)
- **PostgreSQL**: `localhost:5432` (Docker container: `idea_forge_db`)

---

## Arquitectura del Sistema

### Principios de Diseño

1. **Clean Architecture** (Backend Go): Separación de capas domain/usecase/adapter
2. **Dependency Injection**: Interfaces definen contratos, implementaciones son intercambiables
3. **Single Responsibility**: Cada capa tiene una responsabilidad clara
4. **Stateless Services**: Backend y Genkit no mantienen estado en memoria
5. **Database as Source of Truth**: PostgreSQL es la única fuente de verdad

---

## Servicio Backend (Go)

### 🏛️ Estructura de Capas (Clean Architecture)

```
backend/
├── cmd/api/main.go              # Punto de entrada y configuración
├── internal/
│   ├── db/conn.go               # Conexión a PostgreSQL
│   └── ideation/                # Módulo de ideación
│       ├── domain/              # ⭕ Capa de Dominio
│       │   ├── idea.go          # Entidad Idea
│       │   └── message.go       # Entidad Message (parte del domain)
│       ├── port/                # 🔌 Interfaces (contratos)
│       │   └── repository.go    # IdeaRepository interface
│       ├── usecase/             # 💼 Lógica de Negocio
│       │   ├── create_idea.go
│       │   ├── get_idea.go
│       │   ├── list_ideas.go
│       │   ├── update_idea.go
│       │   └── append_message.go
│       └── adapter/             # 🔧 Implementaciones
│           ├── http/handlers.go # HTTP handlers (REST API)
│           └── pg/repo.go       # Repositorio PostgreSQL
```

### 📦 Capa de Dominio (`domain/`)

**Responsabilidad**: Entidades de negocio y reglas de dominio puras (sin dependencias externas)

#### `idea.go`

```go
type Idea struct {
    ID                   uuid.UUID
    Title                string
    Objective            string
    Problem              string
    Scope                string
    ValidateCompetition  bool
    ValidateMonetization bool
    Completed            bool
    CreatedAt            time.Time
}

func NewIdea(title, objective, problem, scope string, comp, monet bool) (*Idea, error)
```

**Validaciones de Dominio**:
- Todos los campos `title`, `objective`, `problem`, `scope` son obligatorios
- Si alguno está vacío, retorna error: `"missing required fields"`
- `ID` se genera automáticamente con `uuid.New()`
- `CreatedAt` se setea con `time.Now().UTC()`
- `Completed` inicia en `false` por defecto

#### `message.go` (dentro de `domain/idea.go`)

```go
type Message struct {
    ID        uuid.UUID
    IdeaID    uuid.UUID
    Role      string // "user" | "assistant" | "system"
    Content   string
    CreatedAt time.Time
}
```

### 🔌 Capa de Puertos (`port/`)

**Responsabilidad**: Definir interfaces (contratos) para abstraer dependencias externas

#### `repository.go`

```go
type IdeaRepository interface {
    // Ideas
    Save(ctx context.Context, idea *domain.Idea) error
    FindByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error)
    FindAll(ctx context.Context, limit int) ([]domain.Idea, error)
    UpdateIdea(ctx context.Context, idea *domain.Idea) error

    // Messages
    AppendMessage(ctx context.Context, msg *domain.Message) error
    ListMessages(ctx context.Context, ideaID uuid.UUID, limit int) ([]domain.Message, error)
}
```

**Ventajas**:
- El dominio y casos de uso NO conocen PostgreSQL
- Se puede cambiar la DB (MongoDB, etc.) sin tocar lógica de negocio
- Facilita testing con mocks

### 💼 Capa de Casos de Uso (`usecase/`)

**Responsabilidad**: Orquestación de lógica de negocio (sin detalles de infraestructura)

#### `create_idea.go`

```go
type CreateIdea struct{ repo port.IdeaRepository }

func (uc *CreateIdea) Execute(ctx context.Context, title, objective, problem, scope string, comp, monet bool) (*domain.Idea, error) {
    idea, err := domain.NewIdea(title, objective, problem, scope, comp, monet)
    if err != nil { return nil, err }
    if err := uc.repo.Save(ctx, idea); err != nil { return nil, err }
    return idea, nil
}
```

**Flujo**:
1. Llama al factory `domain.NewIdea()` → validaciones de dominio
2. Si es válida, guarda en repo → persistencia
3. Retorna la idea creada

#### `update_idea.go`

```go
func (uc *UpdateIdea) Execute(ctx context.Context, id uuid.UUID, title, objective, problem, scope string,
    validateCompetition, validateMonetization bool, completed *bool) (*domain.Idea, error)
```

**Lógica**:
1. Carga idea existente desde repo
2. **Actualización parcial**: Solo sobreescribe campos NO vacíos
3. `completed` puede ser `nil` (no actualizar) o puntero a `bool` (actualizar)
4. Persiste cambios y retorna idea actualizada

#### `append_message.go`

```go
type AppendMessage struct{ repo port.IdeaRepository }

func (uc *AppendMessage) Execute(ctx context.Context, ideaID uuid.UUID, role, content string) (*domain.Message, error)
```

**Uso**: Guardar mensajes del chat (usuario o asistente)

### 🔧 Capa de Adaptadores (`adapter/`)

#### **Adaptador HTTP** (`http/handlers.go`)

**Responsabilidad**: Exponer API REST y traducir HTTP ↔ casos de uso

##### Estructura del Handler

```go
type Handlers struct {
    Create *usecase.CreateIdea
    Get    *usecase.GetIdea
    List   *usecase.ListIdeas
    Update *usecase.UpdateIdea
    Append *usecase.AppendMessage
}

func (h *Handlers) Register(mux *http.ServeMux) {
    mux.HandleFunc("/ideation/ideas", ...)      // POST (crear), GET (listar)
    mux.HandleFunc("/ideation/ideas/", ...)     // GET (obtener), PUT (actualizar)
    mux.Handle("/ideation/agent/chat", ...)     // POST (chat con agente)
}
```

##### Endpoints Implementados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/ideation/ideas` | Crear nueva idea |
| `GET` | `/ideation/ideas` | Listar todas las ideas (límite 50) |
| `GET` | `/ideation/ideas/{id}` | Obtener idea por ID |
| `PUT` | `/ideation/ideas/{id}` | Actualizar idea (parcial) |
| `GET` | `/ideation/ideas/{id}/messages` | Obtener historial de chat |
| `POST` | `/ideation/agent/chat` | Enviar mensaje al agente IA |

##### Handler: `createIdea` (Líneas 52-82)

**Flujo especial**:
1. Valida JSON de entrada
2. Ejecuta `Create.Execute()` → guarda idea en DB
3. **🔥 Envía mensaje inicial del agente en goroutine** (línea 79):
   ```go
   go h.sendInitialAgentMessage(idea)
   ```
4. Retorna idea creada inmediatamente (sin esperar al agente)

**¿Por qué goroutine?**:
- El frontend recibe respuesta rápida
- El agente genera mensaje inicial en background
- Cuando el usuario entre al detalle, el mensaje ya estará

##### Handler: `chat` (Líneas 150-267) - **EL MÁS IMPORTANTE**

**Este es el corazón del sistema**. Flujo completo:

```
Usuario envía mensaje
         ↓
1. Guardar mensaje user en DB (líneas 171-174)
         ↓
2. Cargar idea completa (líneas 177-181)
         ↓
3. Cargar últimos 20 mensajes para historial (líneas 184-192)
         ↓
4. Construir payload para Genkit (líneas 195-204)
   {
     "idea": {title, objective, problem, scope},
     "history": [{role: "user", content: "..."}, ...],
     "message": "mensaje actual del usuario"
   }
         ↓
5. HTTP POST a Genkit :3001/flows/ideationAgent (líneas 208-219)
         ↓
6. Parsear respuesta JSON del agente (líneas 221-230)
   {
     "reply": "respuesta conversacional",
     "shouldUpdate": true/false,
     "updates": {title?, objective?, problem?, scope?},
     "isComplete": true/false
   }
         ↓
7. ¿Agente sugiere actualizaciones o marca como completa? (línea 233)
         ↓
   SI → Actualizar idea en DB (líneas 235-258)
        - Si isComplete=true → marcar completed=true
        - Aplicar updates a campos de la idea
         ↓
8. Guardar respuesta del asistente en DB (líneas 261-264)
         ↓
9. Retornar JSON del agente al frontend (línea 266)
```

**Detalles clave**:
- **Historial contextual**: El agente recibe los últimos 20 mensajes (línea 184)
- **Actualización automática**: Si `shouldUpdate=true`, el backend aplica cambios sin intervención del usuario
- **Detección de completitud**: Si `isComplete=true`, el backend marca `idea.completed=true` (líneas 236-239)
- **Rollback implícito**: Si falla la actualización, retorna error y NO guarda mensaje del asistente

##### Helper: `sendInitialAgentMessage` (Líneas 303-345)

**Flujo**:
1. Convierte idea a map
2. Llama a Genkit con `history=[]` y `message=""` → trigger para mensaje inicial
3. Guarda respuesta del agente en DB como primer mensaje

**Ejecución**: Asíncrona (goroutine), sin manejar errores (silenciosa)

#### **Adaptador PostgreSQL** (`pg/repo.go`)

**Responsabilidad**: Implementar `IdeaRepository` usando SQL puro

##### Métodos de Ideas

```go
func (r *repo) Save(ctx context.Context, i *domain.Idea) error
    → INSERT INTO ideation_ideas (...)

func (r *repo) FindByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error)
    → SELECT ... FROM ideation_ideas WHERE id=$1

func (r *repo) FindAll(ctx context.Context, limit int) ([]domain.Idea, error)
    → SELECT ... FROM ideation_ideas ORDER BY created_at DESC LIMIT $1

func (r *repo) UpdateIdea(ctx context.Context, i *domain.Idea) error
    → UPDATE ideation_ideas SET title=$2, objective=$3, ... WHERE id=$1
```

##### Métodos de Mensajes

```go
func (r *repo) AppendMessage(ctx context.Context, m *domain.Message) error
    → INSERT INTO ideation_messages (id, idea_id, role, content, created_at)

func (r *repo) ListMessages(ctx context.Context, ideaID uuid.UUID, limit int) ([]domain.Message, error)
    → SELECT ... FROM ideation_messages WHERE idea_id=$1 ORDER BY created_at ASC LIMIT $2
```

**Características**:
- **Sin ORM**: SQL puro con `database/sql`
- **Context-aware**: Todos los métodos aceptan `context.Context` para timeouts/cancellations
- **Error handling**: Propaga errores de SQL sin transformarlos

### 🚀 Punto de Entrada (`cmd/api/main.go`)

#### Inicialización del Sistema (Líneas 17-49)

```go
func main() {
    // 1. Cargar variables de entorno desde .env
    _ = godotenv.Load()

    // 2. Conectar a PostgreSQL
    dsn := os.Getenv("DATABASE_URL")  // postgres://app:secret@localhost:5432/idea_forge?sslmode=disable
    sqlDB, err := appdb.OpenPostgres(dsn)
    defer sqlDB.Close()

    // 3. Inyección de dependencias (Clean Architecture)
    repo := ideationpg.NewRepo(sqlDB)
    create := ideationuc.NewCreateIdea(repo)
    get := ideationuc.NewGetIdea(repo)
    list := ideationuc.NewListIdeas(repo)
    update := ideationuc.NewUpdateIdea(repo)
    appendMsg := ideationuc.NewAppendMessage(repo)

    // 4. Configurar HTTP handlers
    mux := http.NewServeMux()
    handlers := &ideationhttp.Handlers{
        Create: create,
        Get: get,
        List: list,
        Update: update,
        Append: appendMsg,
    }
    handlers.Register(mux)

    // 5. Servidor HTTP con middlewares
    srv := &http.Server{
        Addr:              ":8080",
        Handler:           cors(security(mux)),  // Middlewares anidados
        ReadHeaderTimeout: 5 * time.Second,
    }
    log.Println("API listening on :8080")
    log.Fatal(srv.ListenAndServe())
}
```

#### Middleware: `cors` (Líneas 51-70)

**Responsabilidad**: Permitir peticiones cross-origin desde el frontend

```go
func cors(next http.Handler) http.Handler {
    // Permitir peticiones desde localhost:3000 y localhost:3002
    origin := r.Header.Get("Origin")
    if origin == "http://localhost:3000" || origin == "http://localhost:3002" {
        w.Header().Set("Access-Control-Allow-Origin", origin)
    }
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    w.Header().Set("Access-Control-Allow-Credentials", "true")

    // Manejar preflight request (OPTIONS)
    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusNoContent)
        return
    }
    next.ServeHTTP(w, r)
}
```

**Nota de Seguridad**: En producción, usar whitelist dinámica o variable de entorno

#### Middleware: `security` (Líneas 72-79)

**Responsabilidad**: Headers de seguridad HTTP

```go
func security(next http.Handler) http.Handler {
    w.Header().Set("X-Content-Type-Options", "nosniff")    // Prevenir MIME sniffing
    w.Header().Set("X-Frame-Options", "DENY")              // Prevenir clickjacking
    w.Header().Set("X-XSS-Protection", "1; mode=block")    // XSS protection
    next.ServeHTTP(w, r)
}
```

---

## Servicio Genkit (Agente IA)

### 🤖 Arquitectura del Servicio

```
genkit/
├── server.js         # Servidor Express + Google Generative AI
├── package.json
└── .env              # GOOGLE_API_KEY, PORT, GENKIT_TOKEN
```

**Stack Tecnológico**:
- **Runtime**: Node.js
- **Framework HTTP**: Express.js
- **IA SDK**: `@google/generative-ai` (oficial de Google)
- **Modelo**: `gemini-2.0-flash-exp`
- **Modo de Respuesta**: JSON estructurado (`responseMimeType: "application/json"`)

### 🔑 Configuración (Líneas 10-17)

```javascript
const PORT = Number(process.env.PORT || 3001);
const TOKEN = process.env.GENKIT_TOKEN || "";         // Opcional: autenticación
const API_KEY = process.env.GOOGLE_API_KEY;           // Requerido

const genAI = new GoogleGenerativeAI(API_KEY, {
  apiEndpoint: "https://generativelanguage.googleapis.com/v1",  // Forzar v1 (evitar beta)
});
```

### 🔐 Middleware: `checkAuth` (Líneas 19-24)

```javascript
function checkAuth(req, res, next) {
  if (!TOKEN) return next();  // Si no hay token configurado, saltear auth
  const h = req.get("Authorization") || "";
  if (h === `Bearer ${TOKEN}`) return next();
  return res.status(401).json({ error: "unauthorized" });
}
```

**Uso**: Opcional. Si `GENKIT_TOKEN` está definido, el backend debe enviar `Authorization: Bearer <token>`

### 🧠 Endpoint Principal: `/flows/ideationAgent` (Líneas 26-149)

**Método**: `POST`
**Autenticación**: `checkAuth` middleware

#### Input (Request Body)

```json
{
  "idea": {
    "title": "Mi App",
    "objective": "Alcanzar 1000 usuarios en 3 meses",
    "problem": "Los freelancers pierden tiempo buscando clientes",
    "scope": "MVP con perfil, búsqueda, mensajería"
  },
  "history": [
    {"role": "assistant", "content": "¡Hola! Cuéntame más sobre tu proyecto..."},
    {"role": "user", "content": "Es una app para freelancers..."}
  ],
  "message": "Quiero agregar sistema de pagos"
}
```

#### Output (Response)

```json
{
  "reply": "¡Excelente! Agregar pagos es crucial. ¿Qué pasarela vas a usar? ¿Stripe, PayPal?",
  "shouldUpdate": true,
  "updates": {
    "scope": "MVP con perfil, búsqueda, mensajería, y sistema de pagos integrado (Stripe)"
  },
  "isComplete": false
}
```

### 🎯 Lógica Dual de Prompts

El agente tiene **2 comportamientos distintos** según el estado de la conversación:

#### **Modo 1: Primer Mensaje** (Líneas 34-67)

**Condición**: `history.length === 0` o solo hay mensaje system

**Prompt**:
```javascript
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
```

**Características**:
- **Análisis inicial**: Revisa campos vacíos o genéricos
- **Preguntas estratégicas**: 2-3 preguntas para profundizar
- **NO actualiza**: `shouldUpdate: false` (solo conversa)

#### **Modo 2: Conversación Continua** (Líneas 68-122)

**Condición**: `history.length > 0`

**Prompt**:
```javascript
prompt = `
Eres un agente especializado en ideación de proyectos de software.

IDEA ACTUAL:
- Título: "${idea?.title ?? ""}"
- Objetivo: "${idea?.objective ?? ""}"
- Problema: "${idea?.problem ?? ""}"
- Alcance: "${idea?.scope ?? ""}"

CONVERSACIÓN PREVIA:
${historyLines}  // Formato: "user: mensaje\nassistant: respuesta\n..."

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
`.trim();
```

**Características**:
- **Contexto completo**: Incluye historial de conversación
- **Actualización inteligente**: Puede modificar campos si detecta mejoras
- **Detección de completitud**: Evalúa criterios estrictos
- **Guardrails**: Rechaza off-topic y redirige a la ideación

### ⚙️ Configuración del Modelo (Líneas 125-131)

```javascript
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.7,           // Balance entre creatividad y coherencia
    responseMimeType: "application/json"  // Fuerza respuesta JSON válida
  }
});
```

**JSON Mode**: Gemini garantiza que `result.response.text()` sea JSON parseable

### 🛡️ Error Handling (Líneas 136-142)

```javascript
let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  // Fallback si el modelo falla en devolver JSON válido
  parsed = { reply: text, shouldUpdate: false, updates: {} };
}
```

**Resiliencia**: Si Gemini falla en JSON mode (raro), se trata como mensaje simple

### 🏥 Healthcheck (Línea 151)

```javascript
app.get("/healthz", (_req, res) => res.json({ ok: true }));
```

**Uso**: Backend verifica que Genkit esté disponible antes de enviar requests

---

## Base de Datos PostgreSQL

### 📊 Esquema de Tablas

#### Tabla: `ideation_ideas`

```sql
CREATE TABLE ideation_ideas (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    problem TEXT NOT NULL,
    scope TEXT NOT NULL,
    validate_competition BOOLEAN DEFAULT FALSE,
    validate_monetization BOOLEAN DEFAULT FALSE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,  -- Agregada en migración posterior
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ideation_ideas_completed ON ideation_ideas(completed);
```

**Columnas**:
- `id`: UUID generado por backend (NO autoincremental)
- `title`, `objective`, `problem`, `scope`: Campos core de la idea
- `validate_competition`, `validate_monetization`: Flags para módulos futuros
- `completed`: `true` cuando agente detecta completitud o usuario finaliza manualmente
- `created_at`: Timestamp UTC de creación

**Índices**:
- `PRIMARY KEY (id)`: Búsqueda rápida por ID
- `idx_ideation_ideas_completed`: Filtrado eficiente de ideas completadas vs en progreso

#### Tabla: `ideation_messages`

```sql
CREATE TABLE ideation_messages (
    id UUID PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES ideation_ideas(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columnas**:
- `id`: UUID generado por backend
- `idea_id`: Foreign key a `ideation_ideas` (relación 1:N)
- `role`: Tipo de mensaje (`user`, `assistant`, `system`)
- `content`: Texto del mensaje
- `created_at`: Timestamp UTC

**Constraints**:
- `CHECK (role IN (...))`: Validación a nivel DB
- `ON DELETE CASCADE`: Si se borra idea, se borran todos sus mensajes

**Orden**: Los mensajes se cargan con `ORDER BY created_at ASC` para mostrar conversación cronológica

### 🗄️ Migraciones

#### `20251008120000_create_ideation.sql`

Crea las tablas `ideation_ideas` y `ideation_messages` (versión inicial sin `completed`)

#### `20251013170000_add_completed_to_ideas.sql`

```sql
ALTER TABLE ideation_ideas
ADD COLUMN completed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_ideation_ideas_completed ON ideation_ideas(completed);
```

**Aplicación**:
```bash
# Docker
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251008120000_create_ideation.sql
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251013170000_add_completed_to_ideas.sql

# Local
psql -U app -d idea_forge < migrations/20251008120000_create_ideation.sql
psql -U app -d idea_forge < migrations/20251013170000_add_completed_to_ideas.sql
```

---

## Flujos de Datos Completos

### 🆕 Flujo 1: Crear Nueva Idea

```
FRONTEND                    BACKEND GO                  GENKIT                      POSTGRESQL
   │                            │                          │                             │
   │  POST /ideation/ideas      │                          │                             │
   ├───────────────────────────>│                          │                             │
   │  {title, objective, ...}   │                          │                             │
   │                            │                          │                             │
   │                            │ domain.NewIdea()         │                             │
   │                            ├─ Validar campos         │                             │
   │                            ├─ Generar UUID           │                             │
   │                            │                          │                             │
   │                            │ INSERT idea              │                             │
   │                            ├────────────────────────────────────────────────────────>│
   │                            │                          │                             │
   │  ← HTTP 200 {idea}         │                          │                             │
   │<───────────────────────────┤                          │                             │
   │                            │                          │                             │
   │                            │ go sendInitialAgentMessage()                           │
   │                            ├─────────────────────────>│                             │
   │                            │  POST /flows/ideationAgent                             │
   │                            │  {idea, history:[], message:""}                        │
   │                            │                          │                             │
   │                            │                          │ Gemini: Generar saludo      │
   │                            │                          │ + 2-3 preguntas clave       │
   │                            │                          │                             │
   │                            │  ← {reply, shouldUpdate:false}                         │
   │                            │<─────────────────────────┤                             │
   │                            │                          │                             │
   │                            │ INSERT message (assistant)                             │
   │                            ├────────────────────────────────────────────────────────>│
```

**Timing**:
1. Frontend recibe respuesta inmediata (~50ms)
2. Goroutine genera mensaje inicial en background (~2-3s)
3. Frontend hace polling o refresca para ver mensaje inicial

### 💬 Flujo 2: Chat con el Agente

```
FRONTEND                    BACKEND GO                  GENKIT                      POSTGRESQL
   │                            │                          │                             │
   │  POST /ideation/agent/chat │                          │                             │
   ├───────────────────────────>│                          │                             │
   │  {idea_id, message: "..."}│                          │                             │
   │                            │                          │                             │
   │                            │ INSERT message (user)    │                             │
   │                            ├────────────────────────────────────────────────────────>│
   │                            │                          │                             │
   │                            │ SELECT idea by ID        │                             │
   │                            │<────────────────────────────────────────────────────────┤
   │                            │                          │                             │
   │                            │ SELECT last 20 messages  │                             │
   │                            │<────────────────────────────────────────────────────────┤
   │                            │                          │                             │
   │                            │ POST /flows/ideationAgent│                             │
   │                            ├─────────────────────────>│                             │
   │                            │  {idea, history, message}│                             │
   │                            │                          │                             │
   │                            │                          │ Gemini: Analizar contexto   │
   │                            │                          │ → Generar respuesta         │
   │                            │                          │ → Detectar updates          │
   │                            │                          │ → Evaluar completitud       │
   │                            │                          │                             │
   │                            │  ← {reply, shouldUpdate, updates, isComplete}          │
   │                            │<─────────────────────────┤                             │
   │                            │                          │                             │
   │                            │ ¿shouldUpdate o isComplete?                            │
   │                            ├─ SI: UPDATE idea         │                             │
   │                            │   SET title=$1, ...      │                             │
   │                            │   SET completed=true     │ (si isComplete=true)        │
   │                            ├────────────────────────────────────────────────────────>│
   │                            │                          │                             │
   │                            │ INSERT message (assistant)                             │
   │                            ├────────────────────────────────────────────────────────>│
   │                            │                          │                             │
   │  ← HTTP 200                │                          │                             │
   │  {reply, shouldUpdate, updates, isComplete}                                         │
   │<───────────────────────────┤                          │                             │
   │                            │                          │                             │
   │ Frontend detecta isComplete=true                      │                             │
   │ → Muestra modal celebratorio                          │                             │
   │ → Bloquea chat                                        │                             │
```

**Puntos Clave**:
1. **Doble escritura**: Mensaje user + mensaje assistant (2 INSERTs)
2. **Actualización condicional**: Solo si agente lo sugiere
3. **Transaccionalidad implícita**: Si falla UPDATE, no se guarda mensaje assistant
4. **Contexto completo**: Agente recibe últimos 20 mensajes para coherencia

### 🔄 Flujo 3: Actualización Manual de Idea

```
FRONTEND                    BACKEND GO                  POSTGRESQL
   │                            │                             │
   │  PUT /ideation/ideas/{id}  │                             │
   ├───────────────────────────>│                             │
   │  {title: "Nuevo título"}   │                             │
   │                            │                             │
   │                            │ SELECT idea WHERE id=...    │
   │                            │<────────────────────────────┤
   │                            │                             │
   │                            │ UPDATE idea                 │
   │                            │ SET title="Nuevo título"    │
   │                            ├────────────────────────────>│
   │                            │                             │
   │  ← HTTP 200 {idea}         │                             │
   │<───────────────────────────┤                             │
```

**Actualización Parcial**: Solo campos NO vacíos se actualizan (lógica en `update_idea.go:34-45`)

### ✅ Flujo 4: Finalización Manual

```
FRONTEND                    BACKEND GO                  POSTGRESQL
   │                            │                             │
   │  PUT /ideation/ideas/{id}  │                             │
   ├───────────────────────────>│                             │
   │  {completed: true}         │                             │
   │                            │                             │
   │                            │ UPDATE idea                 │
   │                            │ SET completed=true          │
   │                            ├────────────────────────────>│
   │                            │                             │
   │  ← HTTP 200 {idea}         │                             │
   │<───────────────────────────┤                             │
   │                            │                             │
   │ Frontend detecta completed=true                          │
   │ → Muestra modal                                          │
   │ → Bloquea chat                                           │
```

**Uso**: Usuario presiona botón "Finalizar Idea" (bandera) cuando el agente no detecta completitud automáticamente

---

## API Reference

### Crear Idea

**Endpoint**: `POST /ideation/ideas`

**Request**:
```json
{
  "title": "Mi App de Freelancers",
  "objective": "Conectar 1000 freelancers en 3 meses",
  "problem": "Los freelancers pierden 40% de su tiempo buscando clientes",
  "scope": "MVP con perfiles, búsqueda, mensajería, y sistema de pagos",
  "validate_competition": true,
  "validate_monetization": false
}
```

**Response** (200 OK):
```json
{
  "ID": "550e8400-e29b-41d4-a716-446655440000",
  "Title": "Mi App de Freelancers",
  "Objective": "Conectar 1000 freelancers en 3 meses",
  "Problem": "Los freelancers pierden 40% de su tiempo buscando clientes",
  "Scope": "MVP con perfiles, búsqueda, mensajería, y sistema de pagos",
  "ValidateCompetition": true,
  "ValidateMonetization": false,
  "Completed": false,
  "CreatedAt": "2025-10-15T14:30:00Z"
}
```

**Errores**:
- `400`: JSON inválido
- `422`: Campos requeridos faltantes

---

### Listar Ideas

**Endpoint**: `GET /ideation/ideas`

**Response** (200 OK):
```json
[
  {
    "ID": "uuid-1",
    "Title": "Proyecto 1",
    "Objective": "...",
    "Problem": "...",
    "Scope": "...",
    "Completed": true,
    "CreatedAt": "2025-10-14T10:00:00Z"
  },
  {
    "ID": "uuid-2",
    "Title": "Proyecto 2",
    "Completed": false,
    "CreatedAt": "2025-10-15T14:30:00Z"
  }
]
```

**Límite**: 50 ideas más recientes (ordenadas por `created_at DESC`)

---

### Obtener Idea

**Endpoint**: `GET /ideation/ideas/{id}`

**Response** (200 OK):
```json
{
  "ID": "550e8400-e29b-41d4-a716-446655440000",
  "Title": "Mi App",
  "Objective": "...",
  "Problem": "...",
  "Scope": "...",
  "ValidateCompetition": true,
  "ValidateMonetization": false,
  "Completed": false,
  "CreatedAt": "2025-10-15T14:30:00Z"
}
```

**Errores**:
- `400`: ID inválido
- `404`: Idea no encontrada

---

### Actualizar Idea

**Endpoint**: `PUT /ideation/ideas/{id}`

**Request** (actualización parcial):
```json
{
  "title": "Nuevo Título",
  "objective": "Nuevo objetivo con KPIs",
  "completed": true
}
```

**Response** (200 OK):
```json
{
  "ID": "550e8400-e29b-41d4-a716-446655440000",
  "Title": "Nuevo Título",
  "Objective": "Nuevo objetivo con KPIs",
  "Problem": "...",  // Sin cambios
  "Scope": "...",    // Sin cambios
  "Completed": true,
  "CreatedAt": "2025-10-15T14:30:00Z"
}
```

**Nota**: Campos vacíos NO se actualizan (lógica parcial)

---

### Obtener Mensajes

**Endpoint**: `GET /ideation/ideas/{id}/messages`

**Response** (200 OK):
```json
[
  {
    "ID": "msg-uuid-1",
    "IdeaID": "550e8400-e29b-41d4-a716-446655440000",
    "Role": "assistant",
    "Content": "¡Hola! Cuéntame más sobre tu proyecto...",
    "CreatedAt": "2025-10-15T14:30:05Z"
  },
  {
    "ID": "msg-uuid-2",
    "IdeaID": "550e8400-e29b-41d4-a716-446655440000",
    "Role": "user",
    "Content": "Quiero agregar sistema de pagos",
    "CreatedAt": "2025-10-15T14:35:00Z"
  },
  {
    "ID": "msg-uuid-3",
    "IdeaID": "550e8400-e29b-41d4-a716-446655440000",
    "Role": "assistant",
    "Content": "¡Excelente! ¿Qué pasarela vas a usar?",
    "CreatedAt": "2025-10-15T14:35:03Z"
  }
]
```

**Orden**: Cronológico (`ORDER BY created_at ASC`)
**Límite**: 50 mensajes

---

### Chat con Agente

**Endpoint**: `POST /ideation/agent/chat`

**Request**:
```json
{
  "idea_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Quiero agregar notificaciones push"
}
```

**Response** (200 OK):
```json
{
  "reply": "¡Gran idea! Las notificaciones mejorarán el engagement. ¿Las quieres para qué eventos específicos?",
  "shouldUpdate": true,
  "updates": {
    "scope": "MVP con perfiles, búsqueda, mensajería, pagos, y notificaciones push"
  },
  "isComplete": false
}
```

**Errores**:
- `400`: JSON inválido o `idea_id` inválido
- `404`: Idea no encontrada
- `502`: Genkit no disponible o respuesta inválida

**Efectos Secundarios**:
1. Guarda mensaje user en DB
2. Si `shouldUpdate=true`: Actualiza idea con campos en `updates`
3. Si `isComplete=true`: Marca `idea.completed=true`
4. Guarda mensaje assistant en DB

---

## Diagramas de Secuencia

### Detección Automática de Completitud

```
Usuario escribe: "Ya está todo completo"
         ↓
Backend: Guarda mensaje user
         ↓
Backend: Carga idea + últimos 20 mensajes
         ↓
Backend → Genkit: POST {idea, history, message: "Ya está todo completo"}
         ↓
Genkit: Evalúa criterios estrictos:
        ✓ Título específico
        ✓ Objetivo con KPIs
        ✓ Problema con usuario objetivo
        ✓ Alcance con 3+ funcionalidades + tech stack
         ↓
Genkit → Backend: {
  reply: "¡Excelente! Tu idea está bien estructurada.",
  shouldUpdate: false,
  updates: {},
  isComplete: true
}
         ↓
Backend: UPDATE idea SET completed=true
         ↓
Backend: INSERT mensaje assistant
         ↓
Backend → Frontend: {isComplete: true, ...}
         ↓
Frontend:
  - Muestra modal celebratorio 🎉
  - Bloquea chat con banner verde
  - Actualiza sidebar (icono ✅)
```

---

## Variables de Entorno

### Backend Go (`.env`)

```env
DATABASE_URL=postgres://app:secret@localhost:5432/idea_forge?sslmode=disable
GENKIT_BASE_URL=http://localhost:3001
GENKIT_TOKEN=                  # Opcional: token de autenticación
```

### Genkit (`.env`)

```env
PORT=3001
GOOGLE_API_KEY=tu_google_api_key_aqui
GENKIT_TOKEN=                  # Opcional: debe coincidir con backend
```

---

## Mejores Prácticas y Convenciones

### Backend Go

1. **Context Propagation**: Todos los métodos aceptan `context.Context` para timeouts
2. **Error Handling**: Propagar errores sin wrapping (usar `fmt.Errorf` si necesitas contexto)
3. **Dependency Injection**: Pasar interfaces, no implementaciones concretas
4. **Inmutabilidad**: Domain entities no tienen setters (modificar via casos de uso)
5. **SQL Injection**: Usar parámetros posicionales (`$1`, `$2`) SIEMPRE

### Genkit

1. **JSON Mode**: Siempre usar `responseMimeType: "application/json"` para respuestas estructuradas
2. **Fallback Handling**: Tener plan B si JSON parsing falla
3. **Temperature**: `0.7` es balance ideal (creatividad + coherencia)
4. **Historial**: Limitar a últimos N mensajes para evitar context overflow

### Base de Datos

1. **UUIDs**: Generados en backend, NO en DB (portabilidad)
2. **Timestamps**: Usar `TIMESTAMPTZ` (timezone-aware)
3. **Foreign Keys**: Siempre con `ON DELETE CASCADE` para integridad referencial
4. **Índices**: Agregar en columnas usadas en `WHERE`, `ORDER BY`, `JOIN`

---

## Roadmap de Mejoras Técnicas

### Backend

- [ ] **Transacciones**: Wrap operaciones multi-tabla en `BEGIN/COMMIT`
- [ ] **Rate Limiting**: Proteger endpoint `/agent/chat` (costoso con Gemini)
- [ ] **Caching**: Redis para ideas frecuentemente accedidas
- [ ] **Observabilidad**: Logs estructurados (JSON), tracing con OpenTelemetry
- [ ] **Testing**: Unit tests con mocks, integration tests con testcontainers

### Genkit

- [ ] **Streaming**: Usar `generateContentStream()` para respuestas en tiempo real
- [ ] **Retry Logic**: Exponential backoff si Gemini falla (rate limits)
- [ ] **Prompt Versioning**: Sistema para A/B testing de prompts
- [ ] **Monitoring**: Track latencia, tokens usados, errores de Gemini

### Base de Datos

- [ ] **Soft Deletes**: Agregar `deleted_at` en vez de borrar físicamente
- [ ] **Auditoría**: Tabla `audit_log` para rastrear cambios
- [ ] **Full-Text Search**: Índice GIN en `title`, `objective` para búsqueda
- [ ] **Partitioning**: Particionar `ideation_messages` por `created_at` cuando escale

---

## Troubleshooting

### Error: "agent unreachable"

**Causa**: Backend no puede conectar a Genkit en `localhost:3001`

**Solución**:
```bash
# Verificar que Genkit esté corriendo
curl http://localhost:3001/healthz
# Debe retornar: {"ok":true}

# Si no responde, iniciar Genkit
cd genkit
node server.js
```

### Error: "failed to connect to database"

**Causa**: PostgreSQL no está corriendo o credenciales incorrectas

**Solución**:
```bash
# Verificar contenedor Docker
docker ps | grep idea_forge_db

# Si no está corriendo, iniciarlo
docker start idea_forge_db

# Verificar conexión
psql postgres://app:secret@localhost:5432/idea_forge -c "SELECT 1;"
```

### Agente siempre retorna `shouldUpdate: false`

**Causa**: Prompt no es claro o temperatura muy baja

**Solución**:
1. Revisar `server.js:70-122` → ajustar instrucciones del prompt
2. Aumentar `temperature` a `0.8` para más "creatividad"
3. Verificar que `history` tenga contexto suficiente

### Ideas no se marcan como completadas

**Causa**: Criterios de completitud muy estrictos

**Solución**:
1. Revisar `server.js:104-109` → criterios de `isComplete`
2. Opción: Usar botón "Finalizar Idea" (finalización manual)
3. Verificar que `completed` se esté propagando correctamente en `handlers.go:236-239`

---

**Documento generado por**: Claude Code
**Versión del sistema**: Idea Forge v1.0
**Fecha**: 15 de Octubre, 2025
**Autor**: Dark

---

## Contacto y Contribuciones

Para reportar bugs o sugerir mejoras en la arquitectura:
- **GitHub Issues**: [tu-repo/issues](https://github.com/tu-usuario/idea-forge/issues)
- **Email**: tu-email@example.com

¡Feliz desarrollo! 🚀
