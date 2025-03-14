package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/caliecode/la-clipasa/internal/ent/generated/runtime"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/http"
	"github.com/caliecode/la-clipasa/internal/utils/format/colors"
)

func main() {
	var env, specPath string

	flag.StringVar(&env, "env", "", "Environment Variables filename")
	flag.StringVar(&specPath, "spec-path", "openapi.yaml", "OpenAPI specification filepath")
	flag.Parse()

	var errs []string

	if env == "" && internal.AppEnv(os.Getenv("APP_ENV")) != internal.AppEnvProd {
		errs = append(errs, "    - env is required but unset")
	}

	if len(errs) > 0 {
		log.Fatal("error: \n" + strings.Join(errs, "\n"))
	}

	errC, err := http.Run(env)
	if err != nil {
		log.Fatalf("Couldn't run: %s", err)
	}

	fmt.Println("\n" + colors.G + colors.Bold +
		"Visit the playground: \n\t" +
		colors.G + internal.BuildAPIURL("gql-apollo") + " \n\t" +
		colors.G + internal.BuildAPIURL("gql-altair") + " \n\t" +
		colors.Off)

	if err := <-errC; err != nil {
		log.Fatalf("Error while running: %s", err)
	}
}
