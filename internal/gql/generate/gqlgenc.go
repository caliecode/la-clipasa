//go:build ignore

package main

import (
	"context"
	"os"

	"github.com/Yamashou/gqlgenc/config"
	"github.com/Yamashou/gqlgenc/generator"
	"github.com/rs/zerolog/log"
)

func main() {
	changeToGoModDir()

	cfg, err := config.LoadConfig("internal/gql/generate/.gqlgenc.yml")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load config")
		os.Exit(2)
	}

	if err := generator.Generate(context.Background(), cfg); err != nil {
		log.Error().Err(err).Msg("Failed to generate gqlgenc client")
	}
}

func changeToGoModDir() {
	for isRoot := false; !isRoot; {
		if err := os.Chdir(".."); err != nil {
			log.Fatal().Err(err).Msg("Failed to change directory")
			os.Exit(1)
		}
		_, err := os.Stat("go.mod")
		isRoot = err == nil
	}
}
