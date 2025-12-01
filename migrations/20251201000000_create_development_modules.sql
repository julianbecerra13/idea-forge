-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS development_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    architecture_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    functionality TEXT,
    dependencies TEXT,  -- JSON array of module names it depends on
    technical_details TEXT,
    priority INTEGER DEFAULT 0,  -- Order for development
    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_development_modules_architecture FOREIGN KEY (architecture_id)
        REFERENCES architectures(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_development_modules_architecture_id
    ON development_modules(architecture_id);

CREATE INDEX IF NOT EXISTS idx_development_modules_priority
    ON development_modules(architecture_id, priority);

-- Tabla para mensajes del chat global
CREATE TABLE IF NOT EXISTS global_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    affected_modules TEXT,  -- JSON array of modules affected by this message
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_global_chat_messages_idea FOREIGN KEY (idea_id)
        REFERENCES ideation_ideas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_global_chat_messages_idea_id
    ON global_chat_messages(idea_id, created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS global_chat_messages;
DROP TABLE IF EXISTS development_modules;
-- +goose StatementEnd
