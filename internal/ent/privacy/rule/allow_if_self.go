package rule

import (
	"context"

	"entgo.io/ent/entql"
	"github.com/google/uuid"
	"github.com/theopenlane/entx"

	"github.com/laclipasa/la-clipasa/internal"
	"github.com/laclipasa/la-clipasa/internal/ent/generated"
	"github.com/laclipasa/la-clipasa/internal/ent/generated/privacy"
)

// AllowIfSelf determines whether a query or mutation operation should be allowed based on whether the requested data is for the viewer
func AllowIfSelf() privacy.QueryMutationRule {
	return privacy.FilterFunc(func(ctx context.Context, f privacy.Filter) error {
		// IDFilter is used for the user table
		type IDFilter interface {
			WhereID(entql.StringP)
		}

		// UserIDFilter is used for the user_setting table
		type UserIDFilter interface {
			WhereUserID(entql.StringP)
		}

		// OwnerIDFilter is used on user owned entities
		type OwnerIDFilter interface {
			WhereOwnerID(entql.StringP)
		}

		// if the user setting is being deleted, allow it
		// there are no resolvers, this will always be deleted as part
		// of a cascade delete
		if _, ok := f.(UserIDFilter); ok && entx.CheckIsSoftDelete(ctx) {
			return privacy.Allow
		}

		u := internal.GetUserFromCtx(ctx)
		if u == nil {
			return privacy.Skipf("anonymous viewer")
		}
		userID := u.ID.String()

		switch actualFilter := f.(type) {
		case UserIDFilter:
			actualFilter.WhereUserID(entql.StringEQ(userID))
		case OwnerIDFilter:
			actualFilter.WhereOwnerID(entql.StringEQ(userID))
			// always check this at the end because every schema has an ID field
		case IDFilter:
			actualFilter.WhereID(entql.StringEQ(userID))
		case *generated.UserFilter:
			actualFilter.WhereID(entql.ValueEQ(uuid.MustParse(userID)))
		default:
			return privacy.Denyf("unexpected filter type %T", f)
		}

		return privacy.Allow
	},
	)
}
