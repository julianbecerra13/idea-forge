package smtp

import (
	"context"
	"fmt"
	"net/smtp"
)

type EmailService struct {
	smtpHost string
	smtpPort string
	smtpUser string
	smtpPass string
	fromAddr string
}

func NewEmailService(host, port, user, pass, from string) *EmailService {
	return &EmailService{
		smtpHost: host,
		smtpPort: port,
		smtpUser: user,
		smtpPass: pass,
		fromAddr: from,
	}
}

func (s *EmailService) SendVerificationCode(ctx context.Context, email, username, code string) error {
	subject := "Verifica tu cuenta en Idea Forge"
	body := fmt.Sprintf(`
Hola %s,

Gracias por registrarte en Idea Forge.

Tu código de verificación es: %s

Este código expira en 15 minutos.

Si no creaste esta cuenta, puedes ignorar este email.

---
Idea Forge - Transforma tus ideas en proyectos
	`, username, code)

	return s.sendEmail(email, subject, body)
}

func (s *EmailService) SendPasswordResetLink(ctx context.Context, email, username, resetLink string) error {
	subject := "Recupera tu contraseña - Idea Forge"
	body := fmt.Sprintf(`
Hola %s,

Recibimos una solicitud para recuperar tu contraseña.

Haz clic en el siguiente enlace para cambiarla:
%s

Este enlace expira en 1 hora.

Si no solicitaste este cambio, puedes ignorar este email.

---
Idea Forge - Transforma tus ideas en proyectos
	`, username, resetLink)

	return s.sendEmail(email, subject, body)
}

func (s *EmailService) sendEmail(to, subject, body string) error {
	// Si no hay configuración SMTP, solo log (modo desarrollo)
	if s.smtpHost == "" || s.smtpUser == "" {
		fmt.Printf("[EMAIL] To: %s\nSubject: %s\nBody: %s\n", to, subject, body)
		return nil
	}

	// Configurar autenticación
	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPass, s.smtpHost)

	// Construir mensaje con formato correcto RFC 5321
	msg := fmt.Sprintf("From: %s\r\n", s.fromAddr)
	msg += fmt.Sprintf("To: %s\r\n", to)
	msg += fmt.Sprintf("Subject: %s\r\n", subject)
	msg += "MIME-Version: 1.0\r\n"
	msg += "Content-Type: text/plain; charset=UTF-8\r\n"
	msg += "\r\n"
	msg += body

	// Enviar email
	addr := s.smtpHost + ":" + s.smtpPort
	return smtp.SendMail(addr, auth, s.smtpUser, []string{to}, []byte(msg))
}
