package rule

import (
	"context"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated/predicate"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
)

// AllowMutationAfterApplyingOwnerFilter defines a privacy rule for mutations in the context of an owner filter
func AllowMutationAfterApplyingOwnerFilter() privacy.MutationRule {
	type OwnerFilter interface {
		WhereHasOwnerWith(predicates ...predicate.User)
	}

	return privacy.FilterFunc(
		func(ctx context.Context, f privacy.Filter) error {
			ownerFilter, ok := f.(OwnerFilter)
			if !ok {
				return privacy.Deny
			}

			u := internal.GetUserFromCtx(ctx)
			if u == nil {
				return privacy.Skip
			}
			viewerID := u.ID

			ownerFilter.WhereHasOwnerWith(user.ID(viewerID))

			return privacy.Allowf("applied owner filter")
		},
	)
}
