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
