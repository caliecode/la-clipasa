package token

// PrivacyToken interface
type PrivacyToken interface {
	GetContextKey() interface{}
	WhereToken(string) interface{}
}
