package token

import (
	"context"
)

// Oauth2Token that implements the PrivacyToken interface
type Oauth2Token struct {
	PrivacyToken
	externalID string
}

type oauth2TokenKey struct{}

// NewOauth2WithExternalID creates a new PrivacyToken of type OauthTooToken with
// externalID set
func NewOauth2WithExternalID(externalID string) *Oauth2Token {
	return &Oauth2Token{
		externalID: externalID,
	}
}

// GetExternalID from oauth2 token
func (token *Oauth2Token) GetExternalID() string {
	return token.externalID
}

// SetExternalID on the oauth2 token
func (token *Oauth2Token) SetExternalID(externalID string) {
	token.externalID = externalID
}

// GetContextKey from OauthTooToken
func (Oauth2Token) GetContextKey() interface{} {
	return oauth2TokenKey{}
}

func NewContextWithOauth2Token(parent context.Context, externalID string) context.Context {
	return context.WithValue(parent, oauth2TokenKey{}, NewOauth2WithExternalID(externalID))
}

func Oauth2TokenFromContext(ctx context.Context) *Oauth2Token {
	token, _ := ctx.Value(oauth2TokenKey{}).(*Oauth2Token)
	return token
}
