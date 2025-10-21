package port

import (
	"context"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/auth/domain"
)

// UserRepository define las operaciones sobre usuarios
type UserRepository interface {
	// User operations
	CreateUser(ctx context.Context, user *domain.User) error
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByUsername(ctx context.Context, username string) (*domain.User, error)
	UpdateUser(ctx context.Context, user *domain.User) error

	// Email verification operations
	CreateVerificationCode(ctx context.Context, code *domain.EmailVerificationCode) error
	GetVerificationCode(ctx context.Context, userID uuid.UUID, code string) (*domain.EmailVerificationCode, error)
	MarkCodeAsUsed(ctx context.Context, codeID uuid.UUID) error

	// Password reset operations
	CreateResetToken(ctx context.Context, token *domain.PasswordResetToken) error
	GetResetToken(ctx context.Context, token string) (*domain.PasswordResetToken, error)
	MarkTokenAsUsed(ctx context.Context, tokenID uuid.UUID) error
}
