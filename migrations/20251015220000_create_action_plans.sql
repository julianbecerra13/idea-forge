-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'draft',
    functional_requirements TEXT,
    non_functional_requirements TEXT,
    business_logic_flow TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_action_plans_idea FOREIGN KEY (idea_id)
        REFERENCES ideation_ideas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS action_plan_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_action_plan_messages_plan FOREIGN KEY (action_plan_id)
        REFERENCES action_plans(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_action_plans_idea_id
    ON action_plans(idea_id);

CREATE INDEX IF NOT EXISTS idx_action_plans_created_at
    ON action_plans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_plan_messages_plan_id
    ON action_plan_messages(action_plan_id, created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS action_plan_messages;
DROP TABLE IF EXISTS action_plans;
-- +goose StatementEnd
