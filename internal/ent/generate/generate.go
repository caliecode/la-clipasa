package generate

// FIXME: runtime wrongly generated if no hooks or privacy but we use the softdelete
//go:generate go run -mod=mod entc.go
//go:generate go run -mod=mod github.com/99designs/gqlgen
