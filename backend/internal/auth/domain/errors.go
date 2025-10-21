package domain

import "errors"

var (
	// Errores de usuario
	ErrUserNotFound           = errors.New("usuario no encontrado")
	ErrUserAlreadyExists      = errors.New("el usuario ya existe")
	ErrEmailAlreadyExists     = errors.New("el email ya está registrado")
	ErrUsernameAlreadyExists  = errors.New("el nombre de usuario ya está en uso")
	ErrInvalidCredentials     = errors.New("credenciales inválidas")
	ErrUserNotVerified        = errors.New("usuario no verificado")
	ErrUserSuspended          = errors.New("usuario suspendido")

	// Errores de validación
	ErrInvalidEmail           = errors.New("email inválido")
	ErrWeakPassword           = errors.New("contraseña débil")
	ErrPasswordMismatch       = errors.New("las contraseñas no coinciden")
	ErrInvalidUsername        = errors.New("nombre de usuario inválido")

	// Errores de verificación
	ErrInvalidVerificationCode = errors.New("código de verificación inválido")
	ErrExpiredVerificationCode = errors.New("código de verificación expirado")
	ErrCodeAlreadyUsed         = errors.New("código ya utilizado")

	// Errores de reset de contraseña
	ErrInvalidResetToken      = errors.New("token de reset inválido")
	ErrExpiredResetToken      = errors.New("token de reset expirado")
	ErrTokenAlreadyUsed       = errors.New("token ya utilizado")
)
