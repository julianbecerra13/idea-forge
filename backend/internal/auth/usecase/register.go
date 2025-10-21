package usecase

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"regexp"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/dark/idea-forge/internal/auth/domain"
	"github.com/dark/idea-forge/internal/auth/port"
)

type RegisterUseCase struct {
	repo         port.UserRepository
	emailService port.EmailService
}

func NewRegisterUseCase(repo port.UserRepository, emailService port.EmailService) *RegisterUseCase {
	return &RegisterUseCase{
		repo:         repo,
		emailService: emailService,
	}
}

type RegisterInput struct {
	Username        string `json:"username"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
}

func (uc *RegisterUseCase) Execute(ctx context.Context, input RegisterInput) (*domain.User, error) {
	// Validar inputs
	if err := validateEmail(input.Email); err != nil {
		return nil, err
	}

	if err := validateUsername(input.Username); err != nil {
		return nil, err
	}

	if err := validatePassword(input.Password); err != nil {
		return nil, err
	}

	if input.Password != input.ConfirmPassword {
		return nil, domain.ErrPasswordMismatch
	}

	// Verificar que el email no esté registrado
	existingUser, err := uc.repo.GetUserByEmail(ctx, input.Email)
	if err != nil && err != domain.ErrUserNotFound {
		return nil, err
	}
	if existingUser != nil {
		return nil, domain.ErrEmailAlreadyExists
	}

	// Verificar que el username no esté en uso
	existingUser, err = uc.repo.GetUserByUsername(ctx, input.Username)
	if err != nil && err != domain.ErrUserNotFound {
		return nil, err
	}
	if existingUser != nil {
		return nil, domain.ErrUsernameAlreadyExists
	}

	// Hashear contraseña
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Crear usuario
	now := time.Now()
	user := &domain.User{
		ID:           uuid.New(),
		Username:     input.Username,
		Email:        input.Email,
		PasswordHash: string(hashedPassword),
		Status:       domain.UserStatusPendingVerification,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := uc.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	// Generar código de verificación
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
		return nil, err
	}

	// Enviar email con código
	if err := uc.emailService.SendVerificationCode(ctx, user.Email, user.Username, code); err != nil {
		// Log error pero no fallar el registro
		fmt.Printf("Error sending verification email: %v\n", err)
	}

	return user, nil
}

// generateVerificationCode genera un código de 6 dígitos
func generateVerificationCode() string {
	max := big.NewInt(999999)
	n, _ := rand.Int(rand.Reader, max)
	return fmt.Sprintf("%06d", n.Int64())
}

// validateEmail valida formato de email
func validateEmail(email string) error {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return domain.ErrInvalidEmail
	}
	return nil
}

// validateUsername valida nombre de usuario
func validateUsername(username string) error {
	if len(username) < 3 || len(username) > 50 {
		return domain.ErrInvalidUsername
	}
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !usernameRegex.MatchString(username) {
		return domain.ErrInvalidUsername
	}
	return nil
}

// validatePassword valida contraseña
func validatePassword(password string) error {
	if len(password) < 8 {
		return domain.ErrWeakPassword
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper || !hasLower || !hasNumber {
		return domain.ErrWeakPassword
	}

	return nil
}
