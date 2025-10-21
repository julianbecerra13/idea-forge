package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/auth/domain"
	"github.com/dark/idea-forge/internal/auth/port"
)

type ForgotPasswordUseCase struct {
	repo         port.UserRepository
	emailService port.EmailService
	frontendURL  string
}

func NewForgotPasswordUseCase(repo port.UserRepository, emailService port.EmailService, frontendURL string) *ForgotPasswordUseCase {
	return &ForgotPasswordUseCase{
		repo:         repo,
		emailService: emailService,
		frontendURL:  frontendURL,
	}
}

type ForgotPasswordInput struct {
	Email string `json:"email"`
}

func (uc *ForgotPasswordUseCase) Execute(ctx context.Context, input ForgotPasswordInput) error {
	// Buscar usuario por email
	user, err := uc.repo.GetUserByEmail(ctx, input.Email)
	if err != nil {
		// No revelar si el email existe o no (por seguridad)
		if err == domain.ErrUserNotFound {
			return nil
		}
		return err
	}

	// Generar token único
	token := uuid.New().String()
	resetToken := &domain.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      false,
		CreatedAt: time.Now(),
	}

	if err := uc.repo.CreateResetToken(ctx, resetToken); err != nil {
		return err
	}

	// Crear link de reset
	resetLink := uc.frontendURL + "/auth/reset-password?token=" + token

	// Enviar email
	return uc.emailService.SendPasswordResetLink(ctx, user.Email, user.Username, resetLink)
}
