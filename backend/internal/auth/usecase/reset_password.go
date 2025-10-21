package usecase

import (
	"context"
	"time"

	"golang.org/x/crypto/bcrypt"
	"github.com/dark/idea-forge/internal/auth/domain"
	"github.com/dark/idea-forge/internal/auth/port"
)

type ResetPasswordUseCase struct {
	repo port.UserRepository
}

func NewResetPasswordUseCase(repo port.UserRepository) *ResetPasswordUseCase {
	return &ResetPasswordUseCase{repo: repo}
}

type ResetPasswordInput struct {
	Token           string `json:"token"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

func (uc *ResetPasswordUseCase) Execute(ctx context.Context, input ResetPasswordInput) error {
	// Validar contraseñas
	if input.NewPassword != input.ConfirmPassword {
		return domain.ErrPasswordMismatch
	}

	if err := validatePassword(input.NewPassword); err != nil {
		return err
	}

	// Obtener token
	resetToken, err := uc.repo.GetResetToken(ctx, input.Token)
	if err != nil {
		return err
	}

	// Verificar si el token ya fue usado
	if resetToken.Used {
		return domain.ErrTokenAlreadyUsed
	}

	// Verificar si el token está expirado
	if resetToken.IsExpired() {
		return domain.ErrExpiredResetToken
	}

	// Obtener usuario
	user, err := uc.repo.GetUserByID(ctx, resetToken.UserID)
	if err != nil {
		return err
	}

	// Hashear nueva contraseña
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Actualizar contraseña
	user.PasswordHash = string(hashedPassword)
	user.UpdatedAt = time.Now()

	if err := uc.repo.UpdateUser(ctx, user); err != nil {
		return err
	}

	// Marcar token como usado
	return uc.repo.MarkTokenAsUsed(ctx, resetToken.ID)
}
