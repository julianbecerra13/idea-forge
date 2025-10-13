package usecase

import (
	"context"
	"errors"

	"github.com/dark/idea-forge/internal/ideation/domain"
	"github.com/dark/idea-forge/internal/ideation/port"
	"github.com/google/uuid"
)

type AppendMessage struct{ repo port.IdeaRepository }

func NewAppendMessage(r port.IdeaRepository) *AppendMessage { return &AppendMessage{repo: r} }

// Repo expone el repositorio subyacente (para lecturas puntuales desde el handler)
func (uc *AppendMessage) Repo() port.IdeaRepository { return uc.repo }

func (uc *AppendMessage) Execute(ctx context.Context, ideaID uuid.UUID, role, content string) (*domain.Message, error) {
	if role == "" || content == "" {
		return nil, errors.New("invalid message")
	}
	msg := &domain.Message{
		ID:      uuid.New(),
		IdeaID:  ideaID,
		Role:    role,
		Content: content,
	}
	if err := uc.repo.AppendMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}
