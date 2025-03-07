package laclipasa

import (
	"embed"
	_ "embed"
)

//go:embed db/migrations db/post-migrations
var Migrations embed.FS
