package model

import (
	"github.com/caliecode/la-clipasa/internal/ent/generated"
)

// FIXME: need to change generated.go to include it.PostWhereInput = &generated.PostWhereInput{}
// apparently this is supported by gqlgen but its ignoring it here. alternatively good old sed
type ExtendedPostWhereInput struct {
	*generated.PostWhereInput       // embed as is for compat
	IncludeDeleted            *bool `json:"includeDeleted,omitempty"`
	IncludeDeletedOnly        *bool `json:"includeDeletedOnly,omitempty"`
}
