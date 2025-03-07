package gql

import "github.com/laclipasa/la-clipasa/internal/ent/generated/postcategory"

var mutuallyExclCats = map[postcategory.Category]bool{
	postcategory.CategoryRANA:     true,
	postcategory.CategoryORO:      true,
	postcategory.CategoryDIAMANTE: true,
}
