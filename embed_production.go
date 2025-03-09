//go:build production
// +build production

package laclipasa

import (
	"embed"
	_ "embed"
)

//go:embed db/migrations db/post-migrations
var Migrations embed.FS

//go:embed frontend/build/*
var FrontendBuildFS embed.FS
