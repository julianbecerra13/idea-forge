package usecase

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/dark/idea-forge/internal/auth/domain"
	"github.com/dark/idea-forge/internal/auth/port"
)

type LoginUseCase struct {
	repo      port.UserRepository
	jwtSecret string
}

func NewLoginUseCase(repo port.UserRepository, jwtSecret string) *LoginUseCase {
	return &LoginUseCase{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

type LoginInput struct {
	EmailOrUsername string `json:"email_or_username"`
	Password        string `json:"password"`
}

type LoginOutput struct {
	Token string        `json:"token"`
	User  *domain.User  `json:"user"`
}

func (uc *LoginUseCase) Execute(ctx context.Context, input LoginInput) (*LoginOutput, error) {
	// Buscar usuario por email o username
	var user *domain.User
	var err error

	// Intentar primero por email
	if err := validateEmail(input.EmailOrUsername); err == nil {
		user, err = uc.repo.GetUserByEmail(ctx, input.EmailOrUsername)
	} else {
		// Si no es email válido, buscar por username
		user, err = uc.repo.GetUserByUsername(ctx, input.EmailOrUsername)
	}

	if err != nil {
		if err == domain.ErrUserNotFound {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}

	// Validar que el usuario tenga password hash
	if user == nil || user.PasswordHash == "" {
		return nil, domain.ErrInvalidCredentials
	}

	// Verificar contraseña
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	// Verificar que el usuario esté activo
	if user.Status == domain.UserStatusPendingVerification {
		return nil, domain.ErrUserNotVerified
	}

	if user.Status == domain.UserStatusSuspended {
		return nil, domain.ErrUserSuspended
	}

	// Generar JWT token
	token, err := uc.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &LoginOutput{
		Token: token,
		User:  user,
	}, nil
}

func (uc *LoginUseCase) generateToken(user *domain.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID.String(),
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(), // 7 días
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(uc.jwtSecret))
}
