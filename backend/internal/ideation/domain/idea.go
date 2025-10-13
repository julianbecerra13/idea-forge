package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Idea struct {
	ID                   uuid.UUID
	Title                string
	Objective            string
	Problem              string
	Scope                string
	ValidateCompetition  bool
	ValidateMonetization bool
	Completed            bool
	CreatedAt            time.Time
}

func NewIdea(title, objective, problem, scope string, comp, monet bool) (*Idea, error) {
	if title == "" || objective == "" || problem == "" || scope == "" {
		return nil, errors.New("missing required fields")
	}
	return &Idea{
		ID:                   uuid.New(),
		Title:                title,
		Objective:            objective,
		Problem:              problem,
		Scope:                scope,
		ValidateCompetition:  comp,
		ValidateMonetization: monet,
		CreatedAt:            time.Now().UTC(),
	}, nil
}

type Message struct {
	ID       uuid.UUID
	IdeaID   uuid.UUID
	Role     string // user|assistant|system
	Content  string
	CreatedAt time.Time
}
