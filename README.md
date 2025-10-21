# 🚀 Idea Forge

**Idea Forge** es una plataforma inteligente impulsada por IA para estructurar, planificar y diseñar proyectos de software completos. Desde la ideación inicial hasta la arquitectura técnica, Idea Forge te guía a través de un proceso conversacional con agentes de IA especializados.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Tecnologías](#-tecnologías)
- [API Endpoints](#-api-endpoints)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Características

### 🤖 Agentes de IA Especializados

**3 agentes diferentes** que te guían en cada fase:

1. **Agente de Ideación** 💡
   - Conversación guiada con preguntas estratégicas
   - Actualización automática de campos en tiempo real
   - Detección inteligente de completitud
   - Guardrails para mantener enfoque

2. **Analista de Sistemas** 📋
   - Levantamiento de requerimientos funcionales/no funcionales
   - Diseño de flujos de lógica de negocio
   - Análisis de performance y escalabilidad

3. **Arquitecto de Software** 🏗️
   - Generación de historias de usuario
   - Diseño de base de datos (SQL/NoSQL/Híbrida)
   - Recomendación de stack tecnológico
   - Patrones arquitectónicos (MVC, Clean, Microservicios)

### 📊 Sistema de Módulos Progresivos

Navega fluidamente entre 3 módulos interconectados:

```
Módulo 1: Ideación → Módulo 2: Plan de Acción → Módulo 3: Arquitectura
    💡                    📋                        🏗️
```

- **Progress Stepper**: Visualiza en qué módulo estás
- **Navegación Inteligente**: El sidebar te lleva automáticamente al último módulo activo
- **Gating**: Solo puedes avanzar al siguiente módulo si completaste el anterior

### 🎨 Interfaz Moderna y Responsiva

- **Diseño Adaptable**: Desktop (2-3 paneles), tablet, móvil
- **Tema Oscuro/Claro**: Cambio dinámico con persistencia
- **shadcn/ui**: Componentes modernos y accesibles
- **Loading States**: Feedback visual en todas las operaciones
- **Chat Contextual**: Panel lateral o modal según dispositivo

### 💾 Persistencia Completa

- **PostgreSQL**: Base de datos robusta con migrations
- **Clean Architecture**: Backend Go con separación de capas
- **Context Propagation**: Cada módulo usa información de los anteriores

---

## 🎯 Módulos del Sistema

### Módulo 1: Ideación 💡

**Objetivo**: Estructurar y validar tu idea de proyecto

**Campos:**
- Título del proyecto
- Objetivo (con métricas/KPIs)
- Problema que resuelve (usuario objetivo + dolor)
- Alcance del MVP (funcionalidades + tecnologías)

**Funcionalidades:**
- Chat con agente de ideación
- Actualización automática de campos
- Validaciones opcionales (competencia, monetización)
- Detección de completitud con criterios estrictos

**Salida**: Idea estructurada lista para planificación

---

### Módulo 2: Plan de Acción 📋

**Objetivo**: Definir requerimientos técnicos y flujos de negocio

**Campos:**
- Requerimientos Funcionales (RF-001, RF-002...)
- Requerimientos No Funcionales (RNF-001: Performance, Seguridad...)
- Flujo de Lógica de Negocio (diagramas, procesos)
- Tecnologías propuestas
- Riesgos identificados
- Timeline estimado

**Funcionalidades:**
- Chat con analista de sistemas
- Generación automática de contenido inicial basado en la Idea
- Edición manual de todos los campos
- Exportable como documento técnico

**Salida**: Plan de acción técnico completo

---

### Módulo 3: Arquitectura y Datos 🏗️

**Objetivo**: Diseñar la arquitectura técnica del sistema

**Campos:**
- **Historias de Usuario** (US-001, US-002...) en formato estándar
- **Tipo de Base de Datos** (Relacional/NoSQL/Híbrida) con justificación
- **Esquema de Base de Datos** (SQL DDL, JSON schemas)
- **Entidades y Relaciones** (diagramas ER, reglas de negocio)
- **Stack Tecnológico** (Frontend, Backend, DB, Infraestructura)
- **Patrón de Arquitectura** (MVC, Clean, Hexagonal, Microservicios)
- **Arquitectura del Sistema** (capas, seguridad, escalabilidad)

**Funcionalidades:**
- Chat con arquitecto de software senior
- Generación automática usando contexto de Idea + Plan de Acción
- Recomendaciones basadas en mejores prácticas
- Edición y refinamiento colaborativo con IA

**Salida**: Arquitectura técnica lista para implementación

---

## 🏗️ Arquitectura

### Diagrama del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │ Ideación │→ │Plan Acción│→│ Arquitectura │              │
│  └──────────┘  └──────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Go - Clean Architecture)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │ Ideation │  │ActionPlan│  │Architecture  │              │
│  │  Module  │  │  Module  │  │   Module     │              │
│  └──────────┘  └──────────┘  └──────────────┘              │
│       ↓              ↓                ↓                      │
│  PostgreSQL (ideas, action_plans, architectures, messages)  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│           Genkit AI Agents (Node.js + Gemini 2.0)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │ Ideation │  │  Systems │  │  Software    │              │
│  │  Agent   │  │ Analyst  │  │  Architect   │              │
│  └──────────┘  └──────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Directorios

```
idea-forge/
├── backend/                    # Go API (Clean Architecture)
│   ├── cmd/api/               # Punto de entrada HTTP server
│   ├── internal/
│   │   ├── db/                # PostgreSQL connection pool
│   │   ├── ideation/          # Módulo 1: Ideación
│   │   │   ├── domain/        # Entidades (Idea, Message)
│   │   │   ├── port/          # Interfaces (Repository)
│   │   │   ├── usecase/       # Lógica de negocio
│   │   │   └── adapter/
│   │   │       ├── http/      # HTTP handlers
│   │   │       └── pg/        # PostgreSQL implementation
│   │   ├── actionplan/        # Módulo 2: Plan de Acción
│   │   │   ├── domain/        # ActionPlan, Message
│   │   │   ├── port/
│   │   │   ├── usecase/
│   │   │   └── adapter/
│   │   │       ├── http/
│   │   │       └── pg/
│   │   └── architecture/      # Módulo 3: Arquitectura
│   │       ├── domain/        # Architecture, Message
│   │       ├── port/
│   │       ├── usecase/
│   │       └── adapter/
│   │           ├── http/
│   │           └── pg/
│   ├── go.mod
│   └── go.sum
│
├── genkit/                    # Agentes IA (Genkit + Gemini)
│   ├── server.js              # Express server principal
│   ├── architecture-agent.js  # (opcional) Agente separado
│   ├── package.json
│   └── .env
│
├── web/idea-forge-web/        # Frontend (Next.js 15)
│   ├── src/
│   │   ├── app/
│   │   │   ├── ideation/
│   │   │   │   ├── page.tsx           # Crear idea
│   │   │   │   └── [id]/page.tsx      # Detalle idea
│   │   │   ├── action-plan/
│   │   │   │   └── [id]/page.tsx      # Plan de acción
│   │   │   └── architecture/
│   │   │       └── [id]/page.tsx      # Arquitectura
│   │   ├── components/
│   │   │   ├── modules/
│   │   │   │   ├── AIChat.tsx         # Chat reutilizable
│   │   │   │   └── ModuleStepper.tsx  # Progress bar
│   │   │   ├── common/
│   │   │   │   ├── LoadingState.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── PageHeader.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ActionPlanEditor.tsx
│   │   │   ├── ActionPlanChat.tsx
│   │   │   ├── ArchitectureEditor.tsx
│   │   │   └── ArchitectureChat.tsx
│   │   └── lib/
│   │       ├── api.ts         # Axios client + endpoints
│   │       └── utils.ts
│   └── package.json
│
└── migrations/                # SQL migrations (goose)
    ├── 20250113000000_init.sql
    ├── 20251013170000_add_completed_to_ideas.sql
    ├── 20251015190000_add_indexes_for_performance.sql
    ├── 20251015220000_create_action_plans.sql
    ├── 20251016230000_create_architecture_module.sql
    └── 20251016235900_fix_architecture_field_types.sql
```

### Flujo de Datos Completo

```
1. Usuario crea Idea (Módulo 1)
   → Backend guarda en PostgreSQL
   → Genkit genera mensaje inicial de bienvenida
   → Usuario conversa con agente
   → Agente actualiza campos automáticamente
   → Marca como completada cuando cumple criterios

2. Usuario completa Idea → Modal "Ir a Plan de Acción"
   → Backend crea ActionPlan vinculado a Idea
   → Genkit usa contexto de Idea para generar contenido inicial
   → Usuario refina con analista de sistemas
   → Marca como completado

3. Usuario completa Plan → Modal "Ir a Arquitectura"
   → Backend crea Architecture vinculado a ActionPlan
   → Genkit usa contexto de Idea + ActionPlan
   → Genera 7 secciones técnicas automáticamente
   → Usuario refina con arquitecto de software
```

---

## 📦 Requisitos Previos

- **Node.js**: v18+ ([Descargar](https://nodejs.org/))
- **Go**: v1.21+ ([Descargar](https://go.dev/))
- **PostgreSQL**: v14+ ([Descargar](https://www.postgresql.org/))
- **Docker** (opcional): Para PostgreSQL en contenedor
- **Google API Key**: Para Gemini 2.0 Flash ([Obtener](https://ai.google.dev/))

---

## 🔧 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/julianbecerra13/idea-forge.git
cd idea-forge
```

### 2. Configurar Base de Datos

#### Opción A: Docker Compose (Recomendado)

```bash
docker-compose up -d
# ✓ PostgreSQL corriendo en localhost:5432
```

#### Opción B: Docker Manual

```bash
docker run --name idea_forge_db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=app \
  -e POSTGRES_DB=idea_forge \
  -p 5432:5432 \
  -d postgres:16
```

#### Opción C: PostgreSQL Local

```bash
# Crear base de datos
createdb -U postgres idea_forge

# Crear usuario
psql -U postgres -c "CREATE USER app WITH PASSWORD 'app';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE idea_forge TO app;"
```

### 3. Aplicar Migraciones

```bash
# Con Docker
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20250113000000_init.sql
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251013170000_add_completed_to_ideas.sql
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251015190000_add_indexes_for_performance.sql
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251015220000_create_action_plans.sql
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251016230000_create_architecture_module.sql
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251016235900_fix_architecture_field_types.sql

# Con PostgreSQL local
cat migrations/*.sql | psql -U app -d idea_forge
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
DATABASE_URL=postgres://app:app@localhost:5432/idea_forge?sslmode=disable
GENKIT_BASE_URL=http://localhost:3001
```

### Genkit (.env)

Crea `genkit/.env`:

```env
PORT=3001
GOOGLE_API_KEY=tu_google_api_key_aqui
GENKIT_TOKEN=opcional_token_para_auth
```

**Obtener Google API Key:**
1. Ve a https://ai.google.dev/
2. Haz clic en "Get API Key"
3. Crea un proyecto nuevo
4. Copia la API key y pégala en `GOOGLE_API_KEY`

### Frontend (.env.local)

Crea `web/idea-forge-web/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

---

## 🚀 Ejecución

### 🐳 Opción 1: Docker (Recomendado) ⭐

**Levanta todo el proyecto con un solo comando:**

```bash
# 1. Copia y configura las variables de entorno
cp .env.example .env
# Edita .env y agrega tu GOOGLE_API_KEY

# 2. Levanta todos los servicios
docker-compose up -d

# 3. Ver logs (opcional)
docker-compose logs -f

# ✓ Frontend: http://localhost:3000
# ✓ Backend: http://localhost:8080
# ✓ Genkit: http://localhost:3001
# ✓ PostgreSQL: localhost:5432
```

**Comandos útiles:**
```bash
# Detener todos los servicios
docker-compose down

# Reconstruir después de cambios
docker-compose up -d --build

# Ver estado de contenedores
docker-compose ps

# Limpiar todo (incluyendo volúmenes)
docker-compose down -v
```

---

### 💻 Opción 2: Desarrollo Local

Necesitas **3 terminales** abiertas:

#### Terminal 1: Backend Go
```bash
cd backend
go run cmd/api/main.go
# ✓ API listening on :8080
```

#### Terminal 2: Genkit AI Agents
```bash
cd genkit
node server.js
# ✓ Ideation, Action Plan & Architecture agent service running on port 3001
```

#### Terminal 3: Frontend Next.js
```bash
cd web/idea-forge-web
npm run dev
# ✓ Ready on http://localhost:3000
```

### Verificar que Todo Funciona

```bash
# Backend
curl http://localhost:8080/healthz
# → {"ok":true}

# Genkit
curl http://localhost:3001/healthz
# → {"ok":true}

# Frontend
# Abre http://localhost:3000 en tu navegador
```

---

## 📖 Uso

### Flujo Completo: De Idea a Arquitectura

#### 1️⃣ Crear una Nueva Idea (Módulo 1)

1. Ve a http://localhost:3000
2. Click en **"Nueva Idea"**
3. Completa los campos básicos:
   - **Título**: Nombre de tu proyecto
   - **Objetivo**: ¿Qué quieres lograr? (incluye métricas)
   - **Problema**: ¿Qué dolor resuelves y para quién?
   - **Alcance**: ¿Qué incluye tu MVP? (mínimo 3 funcionalidades)
4. Click en **"Crear Idea"**

#### 2️⃣ Conversar con el Agente de Ideación

- **Mensaje inicial automático**: El agente te saluda y hace 2-3 preguntas clave
- **Responde con detalle**: El agente actualiza los campos automáticamente
- **Observa las actualizaciones en tiempo real**
- **Completitud automática**: Cuando cumples los 4 criterios, el agente lo detecta

**Criterios de Completitud:**
- ✅ Título descriptivo y específico
- ✅ Objetivo con métricas/KPIs claros
- ✅ Problema con usuario objetivo Y dolor específico
- ✅ Alcance con 3+ funcionalidades Y tecnologías/límites

#### 3️⃣ Finalizar Idea y Avanzar al Módulo 2

Cuando la idea esté completa:
- 🎉 Modal celebratorio aparece
- Click en **"Ir a Plan de Acción"**
- Se crea automáticamente el Action Plan vinculado a tu Idea

#### 4️⃣ Definir Plan de Acción (Módulo 2)

- **Generación automática**: Genkit crea contenido inicial basado en tu Idea
- **6 campos editables**:
  - Requerimientos Funcionales (RF-XXX)
  - Requerimientos No Funcionales (RNF-XXX)
  - Flujo de Lógica de Negocio
  - Tecnologías
  - Riesgos
  - Timeline
- **Chat con Analista**: Refina y mejora cada sección conversando
- Click en **"Finalizar Plan"** cuando esté completo

#### 5️⃣ Diseñar Arquitectura (Módulo 3)

- Click en **"Ir a Arquitectura"** desde el modal
- **Generación automática**: Usa contexto de Idea + Plan de Acción
- **7 secciones técnicas**:
  - Historias de Usuario (US-XXX)
  - Tipo de Base de Datos (con justificación)
  - Esquema de Base de Datos (SQL DDL / JSON)
  - Entidades y Relaciones
  - Stack Tecnológico
  - Patrón de Arquitectura (MVC, Clean, etc)
  - Arquitectura del Sistema
- **Chat con Arquitecto**: Refina decisiones técnicas
- Click en **"Finalizar"** cuando esté completo

#### 6️⃣ Navegación entre Módulos

- **Progress Stepper**: Muestra en qué módulo estás (1️⃣ → 2️⃣ → 3️⃣)
- **Flechas de navegación**: Navega entre módulos completados
- **Sidebar inteligente**: Click en un proyecto te lleva al último módulo activo
- **Gating**: No puedes acceder a Módulo 2 sin completar Módulo 1

---

## 📁 Estructura del Proyecto

Ver sección [Arquitectura](#-arquitectura) arriba para estructura completa.

### Tecnologías por Capa

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui |
| **Backend** | Go 1.21+, net/http, database/sql, Clean Architecture |
| **AI Agents** | Node.js, Express, Google Generative AI SDK, Gemini 2.0 |
| **Database** | PostgreSQL 16, goose migrations |
| **DevOps** | Docker, Docker Compose |

---

## 🛠️ Tecnologías

### Backend
- **Go 1.21+**: Lenguaje principal
- **net/http**: HTTP server nativo (sin frameworks)
- **database/sql**: Driver PostgreSQL estándar
- **github.com/google/uuid**: UUIDs para IDs
- **Clean Architecture**: Separación domain/port/usecase/adapter

### Agentes IA
- **Node.js 18+**: Runtime
- **Express 4**: HTTP server
- **@google/generative-ai**: Cliente oficial para Gemini
- **Gemini 2.0 Flash Exp**: Modelo de IA
- **dotenv**: Variables de entorno
- **JSON Mode**: Respuestas estructuradas del modelo

### Frontend
- **Next.js 15**: Framework React con App Router
- **React 19**: Biblioteca UI
- **TypeScript 5**: Tipado estático
- **Tailwind CSS 3.4**: Utility-first CSS
- **shadcn/ui**: Componentes UI (Radix + Tailwind)
- **axios**: HTTP client
- **sonner**: Toast notifications
- **next-themes**: Dark/light mode
- **lucide-react**: Sistema de iconos

### Base de Datos
- **PostgreSQL 16**: RDBMS
- **goose**: Migration tool
- **Índices optimizados**: Performance en queries frecuentes

---

## 🔌 API Endpoints

### Ideation Module

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/ideation/ideas` | Crear nueva idea |
| `GET` | `/ideation/ideas` | Listar ideas (limit 50) |
| `GET` | `/ideation/ideas/{id}` | Obtener idea específica |
| `PUT` | `/ideation/ideas/{id}` | Actualizar idea |
| `GET` | `/ideation/ideas/{id}/messages` | Obtener mensajes del chat |
| `POST` | `/ideation/agent/chat` | Enviar mensaje al agente |

### Action Plan Module

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/action-plan` | Crear action plan (vinculado a idea) |
| `GET` | `/action-plan/{id}` | Obtener plan por ID |
| `GET` | `/action-plan/by-idea/{ideaId}` | Obtener plan por idea |
| `PUT` | `/action-plan/{id}` | Actualizar plan |
| `GET` | `/action-plan/{id}/messages` | Mensajes del chat |
| `POST` | `/action-plan/agent/chat` | Chat con analista |

### Architecture Module

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/architecture` | Crear arquitectura (vinculada a plan) |
| `GET` | `/architecture/{id}` | Obtener arquitectura por ID |
| `GET` | `/architecture/by-action-plan/{id}` | Por action plan |
| `PUT` | `/architecture/{id}` | Actualizar arquitectura |
| `GET` | `/architecture/{id}/messages` | Mensajes del chat |
| `POST` | `/architecture/agent/chat` | Chat con arquitecto |

### Genkit AI Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/flows/ideationAgent` | Chat de ideación |
| `POST` | `/action-plan/generate-initial` | Generar plan inicial |
| `POST` | `/action-plan/chat` | Chat de plan |
| `POST` | `/architecture/generate-initial` | Generar arquitectura |
| `POST` | `/architecture/chat` | Chat de arquitectura |
| `GET` | `/healthz` | Health check |

### Ejemplos de Requests

#### Crear Idea

```bash
curl -X POST http://localhost:8080/ideation/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Plataforma de E-learning",
    "objective": "Alcanzar 10,000 usuarios activos en 6 meses",
    "problem": "Estudiantes no tienen acceso a cursos de calidad en español",
    "scope": "MVP con cursos en video, quizzes, certificados"
  }'
```

#### Chat con Agente de Ideación

```bash
curl -X POST http://localhost:3001/flows/ideationAgent \
  -H "Content-Type: application/json" \
  -d '{
    "idea": {
      "title": "Plataforma de E-learning",
      "objective": "10,000 usuarios en 6 meses"
    },
    "message": "¿Qué funcionalidades debería tener el MVP?"
  }'
```

#### Crear Plan de Acción

```bash
curl -X POST http://localhost:8080/action-plan \
  -H "Content-Type: application/json" \
  -d '{"idea_id": "uuid-de-la-idea"}'
```

---

## 🐛 Troubleshooting

### Puerto en uso

```bash
# Mata procesos en puertos
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Genkit
lsof -ti:8080 | xargs kill -9  # Backend

# O usa otros puertos
PORT=3002 npm run dev  # Frontend en 3002
```

### Error de CORS

El backend permite estos orígenes por defecto:
- `http://localhost:3000`
- `http://localhost:3002`

Para agregar más, edita `backend/cmd/api/main.go` líneas 86-89.

### PostgreSQL connection refused

```bash
# Docker
docker ps | grep postgres
docker start idea_forge_db

# Local
pg_isready -U app -d idea_forge
```

### Migración falló

```bash
# Ver qué migraciones se aplicaron
docker exec -i idea_forge_db psql -U app -d idea_forge -c "\dt"

# Aplicar migración específica
docker exec -i idea_forge_db psql -U app -d idea_forge < migrations/20251016230000_create_architecture_module.sql
```

### Google API Key inválida o rate limit

```bash
# Error: 429 Too Many Requests
# Solución: Espera 1 minuto o usa API key de pago

# Error: 401 Unauthorized
# Verifica que GOOGLE_API_KEY en genkit/.env sea correcta
```

### Chat muestra "Invalid Date"

```bash
# Reinicia Genkit
lsof -ti:3001 | xargs kill -9
cd genkit && node server.js
```

### Frontend muestra errores de compilación

```bash
# Borra cache de Next.js
cd web/idea-forge-web
rm -rf .next
npm run dev
```

---

## 🔮 Roadmap

### ✅ Completado
- [x] Módulo 1: Ideación con agente IA
- [x] Módulo 2: Plan de Acción con analista
- [x] Módulo 3: Arquitectura con arquitecto
- [x] Navegación progresiva entre módulos
- [x] Componentes reutilizables (AIChat, ModuleStepper)
- [x] Dark/Light mode
- [x] Responsive design
- [x] Clean Architecture en backend

### 🚧 En Progreso
- [ ] Módulo 4: Generación de Código
- [ ] Export a PDF/Markdown
- [ ] Sistema de autenticación

### 📅 Futuro
- [ ] Diagramas automáticos (Mermaid, PlantUML)
- [ ] Integración con GitHub (crear repos)
- [ ] Templates de proyectos
- [ ] Colaboración en tiempo real
- [ ] Versioning de ideas/planes
- [ ] API pública con rate limiting

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit con formato:
   ```
   Add: nueva funcionalidad
   Fix: corrección de bug
   Update: mejora de feature existente
   Refactor: mejora de código sin cambiar funcionalidad
   ```
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Julian Becerra** - [GitHub](https://github.com/julianbecerra13)

---

## 🙏 Agradecimientos

- [shadcn/ui](https://ui.shadcn.com/) - Sistema de componentes
- [Google Gemini](https://ai.google.dev/) - Modelo de IA
- [Vercel](https://vercel.com/) - Next.js framework
- [Radix UI](https://www.radix-ui.com/) - Componentes primitivos
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [PostgreSQL](https://www.postgresql.org/) - Base de datos

---

## 📊 Estadísticas del Proyecto

- **Líneas de Código**: ~4,000+ (Backend Go + Frontend TS + Genkit JS)
- **Archivos**: 36+ archivos principales
- **Módulos**: 3 módulos completos interconectados
- **Agentes IA**: 3 especializados (Ideación, Análisis, Arquitectura)
- **Endpoints API**: 18+ endpoints REST
- **Componentes React**: 15+ componentes reutilizables
- **Migraciones**: 6 migraciones de base de datos

---

**¡Transforma tus ideas en proyectos estructurados con IA! 🚀**
