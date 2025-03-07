package policy

import (
	"context"

	"entgo.io/ent"

	"github.com/caliecode/la-clipasa/internal"
	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
)

// DenyQueryIfNotAuthenticated denies a query if the user is not authenticated
func DenyQueryIfNotAuthenticated() privacy.QueryRule {
	return privacy.QueryRuleFunc(func(ctx context.Context, q ent.Query) error {
		l := internal.GetLoggerFromCtx(ctx)
		if u := internal.GetUserFromCtx(ctx); u != nil {
			l.Debugf("unable to get authenticated user context")

			return internal.NewErrorf(internal.ErrorCodeUnauthenticated, "unauthenticated")
		}

		return nil
	})
}

// DenyMutationIfNotAuthenticated denies a mutation if the user is not authenticated
func DenyMutationIfNotAuthenticated() privacy.MutationRule {
	return privacy.MutationRuleFunc(func(ctx context.Context, m ent.Mutation) error {
		l := internal.GetLoggerFromCtx(ctx)
		if u := internal.GetUserFromCtx(ctx); u != nil {
			l.Debugf("unable to get authenticated user context")

			return internal.NewErrorf(internal.ErrorCodeUnauthenticated, "unauthenticated")
		}

		return nil
	})
}
