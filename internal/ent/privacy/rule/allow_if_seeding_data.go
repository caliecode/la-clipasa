package rule

import (
	"context"
	"os"

	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
)

func AllowIfSeedingData() privacy.QueryMutationRule {
	return privacy.FilterFunc(func(ctx context.Context, f privacy.Filter) error {
		if os.Getenv("SEEDING_MODE") != "" {
			return privacy.Allow
		}

		return privacy.Deny
	})
}
