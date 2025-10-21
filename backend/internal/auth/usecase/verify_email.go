package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/auth/domain"
	"github.com/dark/idea-forge/internal/auth/port"
)

type VerifyEmailUseCase struct {
	repo port.UserRepository
}

func NewVerifyEmailUseCase(repo port.UserRepository) *VerifyEmailUseCase {
	return &VerifyEmailUseCase{repo: repo}
}

type VerifyEmailInput struct {
	UserID uuid.UUID `json:"user_id"`
	Code   string    `json:"code"`
}

func (uc *VerifyEmailUseCase) Execute(ctx context.Context, input VerifyEmailInput) error {
	// Obtener el código de verificación
	code, err := uc.repo.GetVerificationCode(ctx, input.UserID, input.Code)
	if err != nil {
		return err
	}

	// Verificar si el código ya fue usado
	if code.Used {
		return domain.ErrCodeAlreadyUsed
	}

	// Verificar si el código está expirado
	if code.IsExpired() {
		return domain.ErrExpiredVerificationCode
	}

	// Marcar el código como usado
	if err := uc.repo.MarkCodeAsUsed(ctx, code.ID); err != nil {
		return err
	}

	// Actualizar el estado del usuario a activo
	user, err := uc.repo.GetUserByID(ctx, input.UserID)
	if err != nil {
		return err
	}

	user.Status = domain.UserStatusActive
	user.UpdatedAt = time.Now()

	if err := uc.repo.UpdateUser(ctx, user); err != nil {
		return err
	}

	return nil
}

// ResendVerificationCode reenvía el código de verificación
func (uc *VerifyEmailUseCase) ResendVerificationCode(ctx context.Context, userID uuid.UUID, emailService port.EmailService) error {
	// Obtener usuario
	user, err := uc.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Generar nuevo código
	code := generateVerificationCode()
	verificationCode := &domain.EmailVerificationCode{
		ID:        uuid.New(),
		UserID:    user.ID,
		Code:      code,
		ExpiresAt: time.Now().Add(15 * time.Minute),
		Used:      false,
		CreatedAt: time.Now(),
	}

	if err := uc.repo.CreateVerificationCode(ctx, verificationCode); err != nil {
		return err
	}

	// Enviar email
	return emailService.SendVerificationCode(ctx, user.Email, user.Username, code)
}
