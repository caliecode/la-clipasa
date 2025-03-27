package gql

import (
	"github.com/caliecode/la-clipasa/internal/ent/generated/postcategory"
	"github.com/caliecode/la-clipasa/internal/gql/extramodel"
)

var mutuallyExclCats = map[postcategory.Category]bool{
	postcategory.CategoryRANA:     true,
	postcategory.CategoryORO:      true,
	postcategory.CategoryDIAMANTE: true,
}

func newPostMetadata() *extramodel.PostMetadata {
	return &extramodel.PostMetadata{
		Version: 1,
	}
}
