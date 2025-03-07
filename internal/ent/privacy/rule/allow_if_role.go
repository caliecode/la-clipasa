package rule

import (
	"context"

	"entgo.io/ent/entql"
	"github.com/theopenlane/entx"

	"github.com/laclipasa/la-clipasa/internal"
	"github.com/laclipasa/la-clipasa/internal/auth"
	"github.com/laclipasa/la-clipasa/internal/ent/generated/privacy"
	"github.com/laclipasa/la-clipasa/internal/ent/generated/user"
)

// AllowIfRole determines whether a query or mutation operation should be allowed
// based on the user's role
func AllowIfRole(role user.Role) privacy.QueryMutationRule {
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

		if auth.RoleRank.Get(u.Role) < auth.RoleRank.Get(role) {
			return privacy.Denyf("unauthorized")
		}

		return privacy.Allow
	},
	)
}
