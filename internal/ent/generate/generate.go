package generate

// genhooks subpackage not recognized in vendor mode
//go:generate go run -mod=mod entc.go
//go:generate go run -mod=mod github.com/99designs/gqlgen
//go:generate go run -mod=mod ../../gql/generate/gqlgenc.go
