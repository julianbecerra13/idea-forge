-- +goose Up
-- Cambiar database_type y architecture_pattern de VARCHAR(50) a TEXT
ALTER TABLE architectures ALTER COLUMN database_type TYPE TEXT;
ALTER TABLE architectures ALTER COLUMN architecture_pattern TYPE TEXT;

-- +goose Down
ALTER TABLE architectures ALTER COLUMN database_type TYPE VARCHAR(50);
ALTER TABLE architectures ALTER COLUMN architecture_pattern TYPE VARCHAR(50);
