package gql

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/post"
	"github.com/caliecode/la-clipasa/internal/ent/generated/postcategory"
)

// ToHTML is the resolver for the toHTML field.
func (r *postResolver) ToHTML(ctx context.Context, obj *generated.Post) (string, error) {
	panic(fmt.Errorf("not implemented: ToHTML - toHTML"))
}

// NodeID is the resolver for the nodeId field.
func (r *postResolver) NodeID(ctx context.Context, obj *generated.Post) (string, error) {
	// same as returned by cursor
	return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%d", post.Table, obj.ID))), nil
}

// CreateWithEdges is the resolver for the createWithEdges field.
func (r *createPostInputResolver) CreateWithEdges(ctx context.Context, obj *generated.CreatePostInput, data []postcategory.Category) error {
	panic(fmt.Errorf("not implemented: CreateWithEdges - createWithEdges"))
}
