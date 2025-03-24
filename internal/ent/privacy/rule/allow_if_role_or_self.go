package rule

import (
	"context"
	"errors"

	"entgo.io/ent"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
)

// AllowIfSelfOrHasRole determines whether a mutation operation should be allowed
// if the user either owns the entity or has the specified role
func AllowIfSelfOrHasRole(role user.Role) privacy.MutationRule {
	return privacy.MutationRuleFunc(func(ctx context.Context, m ent.Mutation) error {
		if err := AllowIfRole(role).EvalMutation(ctx, m); errors.Is(err, privacy.Allow) {
			return privacy.Allow
		}
		// this changes the query and adds an owner where clause to the authenticated user
		// which can't be removed, therefore call last. Always returns Allow so query can run.
		// TODO: instead of post not found error due to not being owner return not authorized
		return AllowIfSelf().EvalMutation(ctx, m)
	})
}
