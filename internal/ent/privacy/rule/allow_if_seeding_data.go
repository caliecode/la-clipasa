package rule

import (
	"context"
	"os"

	"github.com/caliecode/la-clipasa/internal/ent/generated/privacy"
)

// if we were to need this it should called first and somehow skip the rest of rules
func AllowIfSeedingData() privacy.QueryMutationRule {
	return privacy.FilterFunc(func(ctx context.Context, f privacy.Filter) error {
		if os.Getenv("SEEDING_MODE") != "" {
			return privacy.Allow
		}

		return privacy.Skip
	})
}
