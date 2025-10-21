package pg

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/auth/domain"
)

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *userRepository {
	return &userRepository{db: db}
}

// CreateUser crea un nuevo usuario
func (r *userRepository) CreateUser(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, username, email, password_hash, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.Status,
		user.CreatedAt,
		user.UpdatedAt,
	)
	if err != nil {
		// Verificar si es error de duplicado
		if err.Error() == "pq: duplicate key value violates unique constraint \"users_email_key\"" {
			return domain.ErrEmailAlreadyExists
		}
		if err.Error() == "pq: duplicate key value violates unique constraint \"users_username_key\"" {
			return domain.ErrUsernameAlreadyExists
		}
		return err
	}
	return nil
}

// GetUserByID obtiene un usuario por ID
func (r *userRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, status, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetUserByEmail obtiene un usuario por email
func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, status, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetUserByUsername obtiene un usuario por nombre de usuario
func (r *userRepository) GetUserByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, status, created_at, updated_at
		FROM users
		WHERE username = $1
	`
	user := &domain.User{}
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// UpdateUser actualiza un usuario
func (r *userRepository) UpdateUser(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET username = $2, email = $3, password_hash = $4, status = $5, updated_at = $6
		WHERE id = $1
	`
	result, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.Status,
		user.UpdatedAt,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return domain.ErrUserNotFound
	}

	return nil
}

// CreateVerificationCode crea un código de verificación
func (r *userRepository) CreateVerificationCode(ctx context.Context, code *domain.EmailVerificationCode) error {
	query := `
		INSERT INTO email_verification_codes (id, user_id, code, expires_at, used, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query,
		code.ID,
		code.UserID,
		code.Code,
		code.ExpiresAt,
		code.Used,
		code.CreatedAt,
	)
	return err
}

// GetVerificationCode obtiene un código de verificación
func (r *userRepository) GetVerificationCode(ctx context.Context, userID uuid.UUID, code string) (*domain.EmailVerificationCode, error) {
	query := `
		SELECT id, user_id, code, expires_at, used, created_at
		FROM email_verification_codes
		WHERE user_id = $1 AND code = $2
		ORDER BY created_at DESC
		LIMIT 1
	`
	verificationCode := &domain.EmailVerificationCode{}
	err := r.db.QueryRowContext(ctx, query, userID, code).Scan(
		&verificationCode.ID,
		&verificationCode.UserID,
		&verificationCode.Code,
		&verificationCode.ExpiresAt,
		&verificationCode.Used,
		&verificationCode.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInvalidVerificationCode
		}
		return nil, err
	}
	return verificationCode, nil
}

// MarkCodeAsUsed marca un código como usado
func (r *userRepository) MarkCodeAsUsed(ctx context.Context, codeID uuid.UUID) error {
	query := `UPDATE email_verification_codes SET used = TRUE WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, codeID)
	return err
}

// CreateResetToken crea un token de reset de contraseña
func (r *userRepository) CreateResetToken(ctx context.Context, token *domain.PasswordResetToken) error {
	query := `
		INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query,
		token.ID,
		token.UserID,
		token.Token,
		token.ExpiresAt,
		token.Used,
		token.CreatedAt,
	)
	return err
}

// GetResetToken obtiene un token de reset
func (r *userRepository) GetResetToken(ctx context.Context, token string) (*domain.PasswordResetToken, error) {
	query := `
		SELECT id, user_id, token, expires_at, used, created_at
		FROM password_reset_tokens
		WHERE token = $1
	`
	resetToken := &domain.PasswordResetToken{}
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&resetToken.ID,
		&resetToken.UserID,
		&resetToken.Token,
		&resetToken.ExpiresAt,
		&resetToken.Used,
		&resetToken.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInvalidResetToken
		}
		return nil, err
	}
	return resetToken, nil
}

// MarkTokenAsUsed marca un token como usado
func (r *userRepository) MarkTokenAsUsed(ctx context.Context, tokenID uuid.UUID) error {
	query := `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, tokenID)
	return err
}
