package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	appdb "github.com/dark/idea-forge/internal/db"
	ideationpg "github.com/dark/idea-forge/internal/ideation/adapter/pg"
	ideationhttp "github.com/dark/idea-forge/internal/ideation/adapter/http"
	ideationuc "github.com/dark/idea-forge/internal/ideation/usecase"

	actionplanpg "github.com/dark/idea-forge/internal/actionplan/adapter/pg"
	actionplanhttp "github.com/dark/idea-forge/internal/actionplan/adapter/http"
	actionplanuc "github.com/dark/idea-forge/internal/actionplan/usecase"

	architecturepg "github.com/dark/idea-forge/internal/architecture/adapter/pg"
	architecturehttp "github.com/dark/idea-forge/internal/architecture/adapter/http"
	architectureuc "github.com/dark/idea-forge/internal/architecture/usecase"

	authpg "github.com/dark/idea-forge/internal/auth/adapter/pg"
	authhttp "github.com/dark/idea-forge/internal/auth/adapter/http"
	authsmtp "github.com/dark/idea-forge/internal/auth/adapter/smtp"
	authuc "github.com/dark/idea-forge/internal/auth/usecase"
	"github.com/dark/idea-forge/internal/middleware"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL no está definido")
	}

	sqlDB, err := appdb.OpenPostgres(dsn)
	if err != nil {
		log.Fatalf("error abriendo DB: %v", err)
	}
	defer sqlDB.Close()

	repo := ideationpg.NewRepo(sqlDB)
	create := ideationuc.NewCreateIdea(repo)
	get := ideationuc.NewGetIdea(repo)
	list := ideationuc.NewListIdeas(repo)
	update := ideationuc.NewUpdateIdea(repo)
	deleteIdea := ideationuc.NewDeleteIdea(repo)
	appendMsg := ideationuc.NewAppendMessage(repo)

	// Configurar HTTP client con timeout para llamadas a servicios externos
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	mux := http.NewServeMux()

	// Ideation handlers
	ideationHandlers := &ideationhttp.Handlers{
		Create:     create,
		Get:        get,
		List:       list,
		Update:     update,
		Delete:     deleteIdea,
		Append:     appendMsg,
		HTTPClient: httpClient,
	}
	ideationHandlers.Register(mux)

	// Action Plan handlers
	actionPlanRepo := actionplanpg.NewRepo(sqlDB)
	actionPlanUsecase := actionplanuc.NewActionPlanUsecase(actionPlanRepo)
	actionPlanHandlers := &actionplanhttp.Handlers{
		Usecase:     actionPlanUsecase,
		HTTPClient:  httpClient,
		IdeaUsecase: get, // Para obtener la idea al crear el plan
	}
	actionPlanHandlers.Register(mux)

	// Architecture handlers
	architectureRepo := architecturepg.NewRepo(sqlDB)
	architectureUsecase := architectureuc.NewArchitectureUsecase(architectureRepo)
	architectureHandlers := &architecturehttp.Handlers{
		Usecase:           architectureUsecase,
		HTTPClient:        httpClient,
		ActionPlanUsecase: actionPlanUsecase,
		IdeaUsecase:       get,
	}
	architectureHandlers.Register(mux)

	// Auth setup
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-key-change-in-production"
		log.Println("WARNING: Using default JWT secret. Set JWT_SECRET env var in production!")
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	// Email service config
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	smtpFrom := os.Getenv("SMTP_FROM")
	if smtpFrom == "" {
		smtpFrom = "Idea Forge <noreply@ideaforge.com>"
	}

	emailService := authsmtp.NewEmailService(smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom)
	authRepo := authpg.NewUserRepository(sqlDB)

	// Auth use cases
	registerUC := authuc.NewRegisterUseCase(authRepo, emailService)
	verifyEmailUC := authuc.NewVerifyEmailUseCase(authRepo)
	loginUC := authuc.NewLoginUseCase(authRepo, jwtSecret)
	forgotPasswordUC := authuc.NewForgotPasswordUseCase(authRepo, emailService, frontendURL)
	resetPasswordUC := authuc.NewResetPasswordUseCase(authRepo)

	// Auth handlers
	authHandlers := authhttp.NewAuthHandler(
		registerUC,
		verifyEmailUC,
		loginUC,
		forgotPasswordUC,
		resetPasswordUC,
		authRepo,
		emailService,
	)

	// Auth routes (public)
	mux.HandleFunc("POST /auth/register", authHandlers.Register)
	mux.HandleFunc("POST /auth/verify-email", authHandlers.VerifyEmail)
	mux.HandleFunc("POST /auth/resend-code", authHandlers.ResendCode)
	mux.HandleFunc("POST /auth/login", authHandlers.Login)
	mux.HandleFunc("POST /auth/forgot-password", authHandlers.ForgotPassword)
	mux.HandleFunc("POST /auth/reset-password", authHandlers.ResetPassword)

	// Auth routes (protected)
	authMiddleware := middleware.AuthMiddleware(jwtSecret)
	mux.Handle("GET /auth/me", authMiddleware(http.HandlerFunc(authHandlers.GetMe)))

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           cors(security(mux)),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Println("API listening on :8080")
	log.Fatal(srv.ListenAndServe())
}

func cors(next http.Handler) http.Handler {
	// Lista blanca de orígenes permitidos
	allowedOrigins := map[string]bool{
		"http://localhost:3000": true,
		"http://localhost:3002": true,
	}

	// En producción, cargar desde variable de entorno
	if prodOrigin := os.Getenv("ALLOWED_ORIGIN"); prodOrigin != "" {
		allowedOrigins[prodOrigin] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Validar que el origin esté en la lista permitida
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if origin != "" {
			// Log de intentos sospechosos
			log.Printf("CORS blocked origin: %s", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight 24h

		// Manejar preflight request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func security(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		next.ServeHTTP(w, r)
	})
}
