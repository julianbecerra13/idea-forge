-- Add completed column to ideation_ideas table
ALTER TABLE ideation_ideas
ADD COLUMN completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for querying completed ideas
CREATE INDEX idx_ideation_ideas_completed ON ideation_ideas(completed);
