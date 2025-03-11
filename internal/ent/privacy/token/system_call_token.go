package token

import (
	"context"
)

// SystemCallToken that implements the PrivacyToken interface
type SystemCallToken struct {
	PrivacyToken
}

type systemCallTokenKey struct{}

// NewSystemCall creates a new PrivacyToken of type SystemCallToken,
// to bypass privacy rules in internal queries.
// Example: query api keys when we authenticate with an api key instead of oauth2 token.
func NewSystemCall() *SystemCallToken {
	return &SystemCallToken{}
}

// GetContextKey from SystemCallToken
func (SystemCallToken) GetContextKey() interface{} {
	return systemCallTokenKey{}
}

func NewContextWithSystemCallToken(parent context.Context) context.Context {
	return context.WithValue(parent, systemCallTokenKey{}, NewSystemCall())
}

func SystemCallTokenFromContext(ctx context.Context) *SystemCallToken {
	token, _ := ctx.Value(systemCallTokenKey{}).(*SystemCallToken)
	return token
}
