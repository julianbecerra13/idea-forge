-- Agregar índices para mejorar performance de queries

-- Índice simple en idea_id para filtrado rápido
CREATE INDEX IF NOT EXISTS idx_ideation_messages_idea_id
ON ideation_messages(idea_id);

-- Índice en created_at para ordenamiento
CREATE INDEX IF NOT EXISTS idx_ideation_messages_created_at
ON ideation_messages(created_at);

-- Índice compuesto para el query más común: filtrar por idea_id y ordenar por created_at
CREATE INDEX IF NOT EXISTS idx_ideation_messages_idea_created
ON ideation_messages(idea_id, created_at);

-- Índice para ideas ordenadas por fecha de creación
CREATE INDEX IF NOT EXISTS idx_ideation_ideas_created_at
ON ideation_ideas(created_at DESC);
