package main

import (
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fmt.Println("DATABASE_URL is required")
		os.Exit(1)
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		fmt.Println("open db:", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := ensureSchemaTable(db); err != nil {
		fmt.Println("ensure schema_migrations:", err)
		os.Exit(1)
	}

	migrationsDir := "infra/db/migrations"
	files, err := readSQLFiles(migrationsDir)
	if err != nil {
		fmt.Println("read migrations:", err)
		os.Exit(1)
	}

	applied, err := appliedMigrations(db)
	if err != nil {
		fmt.Println("read applied migrations:", err)
		os.Exit(1)
	}

	for _, f := range files {
		if applied[f] {
			continue
		}
		fmt.Println("applying", f)
		sqlBytes, err := os.ReadFile(filepath.Join(migrationsDir, f))
		if err != nil {
			fmt.Println("read file:", err)
			os.Exit(1)
		}
		if _, err := db.Exec(string(sqlBytes)); err != nil {
			fmt.Println("exec migration:", err)
			os.Exit(1)
		}
		if _, err := db.Exec("INSERT INTO schema_migrations (filename) VALUES ($1)", f); err != nil {
			fmt.Println("record migration:", err)
			os.Exit(1)
		}
	}

	fmt.Println("migrations complete")
}

func ensureSchemaTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func readSQLFiles(dir string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if strings.HasSuffix(d.Name(), ".sql") {
			files = append(files, d.Name())
		}
		return nil
	})
	sort.Strings(files)
	return files, err
}

func appliedMigrations(db *sql.DB) (map[string]bool, error) {
	rows, err := db.Query("SELECT filename FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := map[string]bool{}
	for rows.Next() {
		var f string
		if err := rows.Scan(&f); err != nil {
			return nil, err
		}
		m[f] = true
	}
	return m, nil
}
