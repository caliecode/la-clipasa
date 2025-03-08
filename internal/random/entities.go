package random

import (
	"context"
	"math/rand"
	"time"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/postcategory"
	"github.com/caliecode/la-clipasa/internal/testutil"
)

var (
	seed int64      = time.Now().UnixNano() // Default to a random seed
	r    *rand.Rand = rand.New(rand.NewSource(seed))
)

// SetSeed sets the seed for the random number generator.
func SetSeed(s int64) {
	seed = s
	r = rand.New(rand.NewSource(seed))
}

func Source() *rand.Rand {
	return r
}

func NewUser(ctx context.Context) *generated.User {
	client := generated.FromContext(ctx)

	return client.User.Create().
		SetDisplayName(testutil.RandomFirstName()).
		SetExternalID(testutil.RandomString(20)).
		SaveX(ctx)
}

func NewPost(ctx context.Context, author *generated.User) *generated.Post {
	client := generated.FromContext(ctx)

	p := client.Post.Create().
		SetTitle(testutil.RandomLoremIpsum(5, 20)).
		SetLink(testutil.RandomLink()).
		SetOwner(author).
		SaveX(internal.SetUserCtx(ctx, author))

	return p
}

func NewComment(ctx context.Context, author *generated.User, post *generated.Post) *generated.Comment {
	client := generated.FromContext(ctx)

	return client.Comment.Create().
		SetContent(testutil.RandomLoremIpsumParagraph()).
		SetOwner(author).
		SetPost(post).
		SaveX(internal.SetUserCtx(ctx, author))
}

func randomPostCategory() postcategory.Category {
	x := postcategory.AllCategories()[r.Intn(len(postcategory.AllCategories()))]
	return x
}

func NewPostCategory(ctx context.Context) *generated.PostCategory {
	client := generated.FromContext(ctx)

	return client.PostCategory.Create().SetCategory(randomPostCategory()).SaveX(ctx)
}
