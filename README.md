# 🚀 Idea Forge

**Idea Forge** es una plataforma inteligente para estructurar y validar ideas de proyectos de software mediante conversación con un agente de IA especializado en ideación.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Tecnologías](#-tecnologías)
- [API Endpoints](#-api-endpoints)

---

## ✨ Características

### 🤖 Agente de Ideación Inteligente
- **Conversación Guiada**: El agente inicia automáticamente con preguntas estratégicas para entender tu proyecto
- **Actualización Automática**: Analiza tus respuestas y actualiza los campos de la idea en tiempo real
- **Detección de Completitud**: Evalúa objetivamente cuándo una idea está bien estructurada con criterios específicos
- **Guardrails**: Mantiene el enfoque en la ideación del proyecto, rechazando preguntas off-topic

### 📊 Gestión de Ideas
- **Campos Estructurados**: Título, Objetivo, Problema, Alcance
- **Validaciones**: Opciones para validar competencia y monetización
- **Historial**: Visualiza todos tus proyectos en el sidebar con indicador de completitud
- **Estados**: Ideas en progreso (🔵) vs completadas (✅)

### 🎨 Interfaz Moderna
- **Diseño Responsivo**: Desktop (3 paneles), tablet, y móvil
- **Tema Oscuro/Claro**: Cambio dinámico con persistencia
- **shadcn/ui**: Componentes modernos y accesibles
- **Navegación Intuitiva**: Sidebar fijo con historial de proyectos

### 💬 Chat en Tiempo Real
- **Panel Lateral**: Chat siempre visible en desktop
- **Modal Móvil**: Sheet deslizable en dispositivos pequeños
- **Auto-scroll**: Desplazamiento automático a nuevos mensajes
- **Indicadores**: Loading states, typing indicators, timestamps

---

## 🏗️ Arquitectura

```
idea-forge/
├── backend/              # Go API (Clean Architecture)
│   ├── cmd/api/         # Punto de entrada
│   ├── internal/
│   │   ├── db/          # PostgreSQL connection
│   │   └── ideation/    # Módulo de ideación
│   │       ├── domain/      # Entidades
│   │       ├── port/        # Interfaces
│   │       ├── usecase/     # Lógica de negocio
│   │       └── adapter/     # Implementaciones
│   │           ├── http/    # Handlers HTTP
│   │           └── pg/      # Repositorio PostgreSQL
├── genkit/              # Agente IA (Genkit + Gemini)
│   └── server.js        # Servidor Express con prompts
├── web/                 # Frontend Next.js 15
│   └── idea-forge-web/
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   ├── components/  # React components
│       │   └── lib/         # Utilities y API client
└── migrations/          # SQL migrations
```

### Flujo de Datos

```
1. Usuario crea idea → Backend guarda → Genkit genera mensaje inicial
2. Usuario responde → Backend envía a Genkit → Genkit analiza y actualiza
3. Genkit detecta completitud → Backend marca como completa → Frontend muestra modal
```

---

## 📦 Requisitos Previos

- **Node.js**: v18+ ([Descargar](https://nodejs.org/))
- **Go**: v1.21+ ([Descargar](https://go.dev/))
- **PostgreSQL**: v14+ ([Descargar](https://www.postgresql.org/))
- **Docker** (opcional): Para correr PostgreSQL en contenedor
- **Google API Key**: Para Gemini 2.0 Flash ([Obtener](https://ai.google.dev/))

---

## 🔧 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/idea-forge.git
cd idea-forge
```

### 2. Configurar Base de Datos

#### Opción A: Docker (Recomendado)

```bash
docker run --name idea_forge_db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=idea_forge \
  -p 5432:5432 \
  -d postgres:15
```

#### Opción B: PostgreSQL Local

```bash
# Crear base de datos
createdb -U postgres idea_forge

# Crear usuario
psql -U postgres -c "CREATE USER app WITH PASSWORD 'secret';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE idea_forge TO app;"
```

### 3. Aplicar Migraciones

```bash
# Si usas Docker
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20250113000000_init.sql
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251013170000_add_completed_to_ideas.sql

# Si usas PostgreSQL local
psql -U app -d idea_forge < migrations/20250113000000_init.sql
psql -U app -d idea_forge < migrations/20251013170000_add_completed_to_ideas.sql
```

### 4. Instalar Dependencias

#### Backend (Go)
```bash
cd backend
go mod download
```

#### Genkit (Node.js)
```bash
cd genkit
npm install
```

#### Frontend (Next.js)
```bash
cd web/idea-forge-web
npm install
```

---

## ⚙️ Configuración

### Backend (.env)

Crea `backend/.env`:

```env
DATABASE_URL=postgres://app:secret@localhost:5432/idea_forge?sslmode=disable
GENKIT_BASE_URL=http://localhost:3001
```

### Genkit (.env)

Crea `genkit/.env`:

```env
PORT=3001
GOOGLE_API_KEY=tu_google_api_key_aqui
GENKIT_TOKEN=opcional_token_para_auth
```

### Frontend (.env.local)

Crea `web/idea-forge-web/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

---

## 🚀 Ejecución

### Iniciar Todos los Servicios

Necesitas **3 terminales** abiertas:

#### Terminal 1: Backend Go
```bash
cd backend
go run ./cmd/api
# ✓ API listening on :8080
```

#### Terminal 2: Genkit Agent
```bash
cd genkit
node server.js
# ✓ Ideation agent service running on port 3001
```

#### Terminal 3: Frontend Next.js
```bash
cd web/idea-forge-web
npm run dev
# ✓ Ready on http://localhost:3000
```

### Verificar que Todo Funciona

1. **Backend**: `curl http://localhost:8080/healthz` → `{"ok":true}`
2. **Genkit**: `curl http://localhost:3001/healthz` → `{"ok":true}`
3. **Frontend**: Abre http://localhost:3000 en tu navegador

---

## 📖 Uso

### 1. Crear una Nueva Idea

1. Ve a http://localhost:3000
2. Click en **"Nueva Idea"** en el sidebar
3. Completa los campos básicos:
   - **Título**: Nombre de tu proyecto
   - **Objetivo**: ¿Qué quieres lograr?
   - **Problema**: ¿Qué dolor resuelves?
   - **Alcance**: ¿Qué incluye tu MVP?
4. (Opcional) Activa las validaciones de competencia/monetización
5. Click en **"Crear Idea"**

### 2. Conversar con el Agente

Una vez creada la idea:

1. **Mensaje inicial automático**: El agente te saludará y hará 2-3 preguntas clave
2. **Responde con detalle**: Cuanto más contexto des, mejor estructurará tu idea
3. **Observa las actualizaciones**: Los campos se actualizan automáticamente mientras conversas
4. **Completitud automática**: Cuando la idea esté bien estructurada, el agente lo detectará

### 3. Finalización

Cuando el agente determine que tu idea está completa:

- 🎉 **Modal celebratorio** aparece
- ✅ **Chat bloqueado** con banner verde
- 🔒 **Ya no puedes editar** (idea completada)

**Finalización manual**: Si hablas mucho y el agente no detecta completitud, usa el botón **"Finalizar Idea"** (icono de bandera) en la parte inferior del chat.

### 4. Navegar por el Historial

- **Sidebar izquierdo**: Muestra todos tus proyectos
- **Indicador verde**: Proyectos completados (✅)
- **Click**: Navega al detalle de cualquier proyecto

---

## 📁 Estructura del Proyecto

### Backend (Go - Clean Architecture)

```
backend/
├── cmd/api/main.go              # Entry point, CORS, server
├── internal/
│   ├── db/db.go                 # PostgreSQL connection pool
│   └── ideation/
│       ├── domain/
│       │   ├── idea.go          # Idea entity
│       │   └── message.go       # Message entity
│       ├── port/
│       │   └── repository.go    # Repository interface
│       ├── usecase/
│       │   ├── create_idea.go
│       │   ├── get_idea.go
│       │   ├── list_ideas.go
│       │   ├── update_idea.go
│       │   └── append_message.go
│       └── adapter/
│           ├── http/handlers.go # HTTP handlers
│           └── pg/repo.go       # PostgreSQL implementation
├── go.mod
└── go.sum
```

### Genkit (Node.js + Gemini)

```
genkit/
├── server.js                    # Express server
├── package.json
└── .env                         # Google API Key
```

**Características del Agente:**
- Prompt dual: Primer mensaje vs conversación continua
- JSON Mode: Respuestas estructuradas (`reply`, `shouldUpdate`, `updates`, `isComplete`)
- Criterios estrictos de completitud
- Guardrails para mantener enfoque

### Frontend (Next.js 15 + shadcn/ui)

```
web/idea-forge-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout con providers
│   │   ├── page.tsx             # Home page
│   │   ├── ideation/
│   │   │   ├── page.tsx         # Crear idea
│   │   │   └── [id]/page.tsx    # Detalle de idea
│   │   └── globals.css          # Tailwind + shadcn tokens
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── sidebar.tsx          # Navegación + historial
│   │   ├── ChatPanel.tsx        # Chat con agente
│   │   ├── IdeaCards.tsx        # Display de campos
│   │   ├── theme-provider.tsx
│   │   └── mode-toggle.tsx
│   └── lib/
│       ├── api.ts               # Axios client + endpoints
│       └── utils.ts             # cn() helper
├── tailwind.config.js
├── components.json              # shadcn config
└── package.json
```

---

## 🛠️ Tecnologías

### Backend
- **Go 1.21+**: Lenguaje principal
- **net/http**: HTTP server nativo
- **database/sql**: Driver PostgreSQL
- **github.com/google/uuid**: UUIDs para IDs

### Agente IA
- **Node.js**: Runtime
- **Express**: HTTP server
- **Google Generative AI SDK**: Cliente para Gemini
- **Gemini 2.0 Flash Exp**: Modelo de IA
- **dotenv**: Variables de entorno

### Frontend
- **Next.js 15**: Framework React con App Router
- **React 19**: Biblioteca UI
- **TypeScript**: Tipado estático
- **Tailwind CSS 3.4**: Utility-first CSS
- **shadcn/ui**: Componentes UI (Radix UI + Tailwind)
- **axios**: HTTP client
- **sonner**: Toast notifications
- **next-themes**: Dark/light mode
- **lucide-react**: Iconos

### Base de Datos
- **PostgreSQL 15**: Base de datos relacional
- **Docker** (opcional): Containerización

---

## 🔌 API Endpoints

### Ideas

#### `POST /ideation/ideas`
Crear nueva idea

**Request:**
```json
{
  "title": "Mi App",
  "objective": "Lograr X usuarios en Y tiempo",
  "problem": "Los usuarios sufren Z",
  "scope": "MVP con A, B, C funcionalidades",
  "validate_competition": true,
  "validate_monetization": false
}
```

**Response:**
```json
{
  "ID": "uuid",
  "Title": "Mi App",
  "Objective": "...",
  "Problem": "...",
  "Scope": "...",
  "ValidateCompetition": true,
  "ValidateMonetization": false,
  "Completed": false,
  "CreatedAt": "2025-01-13T..."
}
```

#### `GET /ideation/ideas`
Listar todas las ideas (límite: 50)

**Response:**
```json
[
  {
    "ID": "uuid",
    "Title": "Proyecto 1",
    "Completed": true,
    "CreatedAt": "..."
  },
  ...
]
```

#### `GET /ideation/ideas/{id}`
Obtener idea específica

#### `PUT /ideation/ideas/{id}`
Actualizar idea

**Request:**
```json
{
  "title": "Nuevo título",
  "objective": "Nuevo objetivo",
  "completed": true  // opcional
}
```

#### `GET /ideation/ideas/{id}/messages`
Obtener mensajes del chat

### Chat

#### `POST /ideation/agent/chat`
Enviar mensaje al agente

**Request:**
```json
{
  "idea_id": "uuid",
  "message": "Mi mensaje al agente"
}
```

**Response:**
```json
{
  "reply": "Respuesta del agente",
  "shouldUpdate": true,
  "updates": {
    "title": "Título mejorado",
    "objective": "Objetivo con métricas"
  },
  "isComplete": false
}
```

---

## 🎯 Criterios de Completitud del Agente

El agente marca una idea como completa **SOLO** si cumple **TODOS** estos criterios:

1. ✅ **Título**: Descriptivo y específico (no genérico)
2. ✅ **Objetivo**: Tiene métricas o KPIs claros (ej: "reducir en 30%", "llegar a 1000 usuarios")
3. ✅ **Problema**: Menciona usuario objetivo específico Y el dolor que sufre
4. ✅ **Alcance**: Define MVP con al menos 3 funcionalidades concretas Y menciona tecnologías o límites

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: amazing feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Dark** - [GitHub](https://github.com/julianbecerra13)

---

## 🙏 Agradecimientos

- [shadcn/ui](https://ui.shadcn.com/) - Sistema de componentes
- [Google Gemini](https://ai.google.dev/) - Modelo de IA
- [Vercel](https://vercel.com/) - Next.js framework
- [Radix UI](https://www.radix-ui.com/) - Componentes primitivos

---

## 🐛 Troubleshooting

### Puerto 3000 en uso
```bash
# Mata el proceso en el puerto 3000
lsof -ti:3000 | xargs kill -9

# O usa otro puerto
PORT=3002 npm run dev
```

### Error de CORS
Verifica que el backend esté configurado para permitir peticiones desde tu puerto del frontend (3000, 3002, etc).

### PostgreSQL connection refused
```bash
# Verifica que PostgreSQL esté corriendo
docker ps  # o
pg_isready -U app -d idea_forge
```

### Google API Key inválida
1. Ve a https://ai.google.dev/
2. Crea un proyecto y obtén una API Key
3. Actualiza `genkit/.env`

---

## 🔮 Roadmap

- [ ] Sistema de autenticación (usuarios)
- [ ] Módulo de validación de competencia
- [ ] Módulo de validación de monetización
- [ ] Export de ideas a PDF/Markdown
- [ ] Diagramas automáticos (arquitectura, flujos)
- [ ] Integración con GitHub para crear repos automáticamente
- [ ] Generación de código base (scaffolding)

---

**¡Feliz Ideación! 🚀**
