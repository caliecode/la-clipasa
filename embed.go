//go:build !frontendbuild
// +build !frontendbuild

package laclipasa

import (
	"embed"
	_ "embed"
)

//go:embed db/migrations db/post-migrations
var Migrations embed.FS

//go:embed frontend/build/*
var FrontendBuildFS embed.FS // will fail if empty
