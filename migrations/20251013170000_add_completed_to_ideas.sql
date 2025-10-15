-- +goose Up
-- +goose StatementBegin
-- Add completed column to ideation_ideas table
ALTER TABLE ideation_ideas
ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for querying completed ideas
CREATE INDEX IF NOT EXISTS idx_ideation_ideas_completed ON ideation_ideas(completed);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_ideation_ideas_completed;
ALTER TABLE ideation_ideas DROP COLUMN IF EXISTS completed;
-- +goose StatementEnd
