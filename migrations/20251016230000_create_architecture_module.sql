-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS architectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'draft',

    -- Historias de Usuario
    user_stories TEXT,

    -- Diseño de Base de Datos
    database_type VARCHAR(50),  -- 'relational', 'nosql', 'hybrid'
    database_schema TEXT,
    entities_relationships TEXT,

    -- Arquitectura Técnica
    tech_stack TEXT,
    architecture_pattern TEXT,  -- 'mvc', 'clean', 'hexagonal', 'microservices', etc
    system_architecture TEXT,

    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_architectures_action_plan FOREIGN KEY (action_plan_id)
        REFERENCES action_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    architecture_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_architecture_messages_architecture FOREIGN KEY (architecture_id)
        REFERENCES architectures(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_architectures_action_plan_id
    ON architectures(action_plan_id);

CREATE INDEX IF NOT EXISTS idx_architectures_created_at
    ON architectures(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_architecture_messages_architecture_id
    ON architecture_messages(architecture_id, created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS architecture_messages;
DROP TABLE IF EXISTS architectures;
-- +goose StatementEnd
