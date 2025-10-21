package port

import "context"

// EmailService define las operaciones de envío de emails
type EmailService interface {
	SendVerificationCode(ctx context.Context, email, username, code string) error
	SendPasswordResetLink(ctx context.Context, email, username, resetLink string) error
}
