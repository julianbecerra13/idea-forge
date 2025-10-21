-- +goose Up
-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_status CHECK (status IN ('pending_verification', 'active', 'suspended'))
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- Tabla de códigos de verificación de email
CREATE TABLE email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verification_user_id ON email_verification_codes(user_id);
CREATE INDEX idx_verification_code ON email_verification_codes(code);

-- Tabla de tokens de recuperación de contraseña
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_user_id ON password_reset_tokens(user_id);

-- Agregar user_id a tablas existentes
ALTER TABLE ideation_ideas ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE action_plans ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE architectures ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Índices para filtrar por usuario
CREATE INDEX idx_ideas_user_id ON ideation_ideas(user_id);
CREATE INDEX idx_action_plans_user_id ON action_plans(user_id);
CREATE INDEX idx_architectures_user_id ON architectures(user_id);

-- +goose Down
-- Eliminar índices de user_id
DROP INDEX IF EXISTS idx_architectures_user_id;
DROP INDEX IF EXISTS idx_action_plans_user_id;
DROP INDEX IF EXISTS idx_ideas_user_id;

-- Remover columnas user_id
ALTER TABLE architectures DROP COLUMN IF EXISTS user_id;
ALTER TABLE action_plans DROP COLUMN IF EXISTS user_id;
ALTER TABLE ideation_ideas DROP COLUMN IF EXISTS user_id;

-- Eliminar tablas de auth
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_codes;
DROP TABLE IF EXISTS users;
