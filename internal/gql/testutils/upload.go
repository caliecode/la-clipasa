package testutils

import (
	"fmt"
	"io"

	"github.com/99designs/gqlgen/graphql"
)

type Upload struct {
	File        io.ReadSeeker
	Filename    string
	Size        int64
	ContentType string
}

func MarshalUpload(f Upload) graphql.Marshaler {
	return graphql.WriterFunc(func(w io.Writer) {
		io.Copy(w, f.File)
	})
}

func UnmarshalUpload(v any) (Upload, error) {
	upload, ok := v.(Upload)
	if !ok {
		return Upload{}, fmt.Errorf("%T is not an Upload", v)
	}
	return upload, nil
}
