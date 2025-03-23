//go:build !production

package laclipasa

import (
	"embed"
	_ "embed"
)

//go:embed db/migrations db/post-migrations
var Migrations embed.FS
var FrontendBuildFS embed.FS

//go:embed internal/ent/entgql_templates/*
var EntgqlTemplates embed.FS
