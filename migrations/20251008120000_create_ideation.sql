-- +goose Up
CREATE TABLE ideation_ideas (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    problem TEXT NOT NULL,
    scope TEXT NOT NULL,
    validate_competition BOOLEAN DEFAULT FALSE,
    validate_monetization BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ideation_messages (
    id UUID PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES ideation_ideas(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- +goose Down
DROP TABLE ideation_messages;
DROP TABLE ideation_ideas;
