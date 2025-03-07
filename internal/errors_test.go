package internal_test

import (
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/laclipasa/la-clipasa/internal"
)

func TestErrorCause(t *testing.T) {
	t.Parallel()

	var ierr *internal.Error

	err := internal.NewErrorf(internal.ErrorCodeUnknown, "root")
	err = internal.WrapErrorf(err, internal.ErrorCodeInvalidArgument, "wrapped 1")
	err = internal.WrapErrorf(err, internal.ErrorCodeInvalidArgument, "wrapped 2")
	errors.As(err, &ierr)
	assert.Equal(t, "root", ierr.Cause().Error())

	err = internal.NewErrorf(internal.ErrorCodeUnknown, "root")
	errors.As(err, &ierr)
	assert.Equal(t, "root", ierr.Cause().Error())

	err = internal.NewErrorf(internal.ErrorCodeUnknown, "root")
	err = fmt.Errorf("wrapper not an internal.Error %s", err.Error())
	errors.As(err, &ierr)
	assert.Equal(t, "root", ierr.Cause().Error())

	err = errors.New("not an internal.Error")
	err = internal.WrapErrorf(err, internal.ErrorCodeUnknown, "root")
	errors.As(err, &ierr)
	assert.Equal(t, "not an internal.Error", ierr.Cause().Error())
}

func TestErrorWithLoc(t *testing.T) {
	t.Parallel()

	var ierr *internal.Error

	err := internal.NewErrorWithLocf(internal.ErrorCodeUnknown, []string{"nested", "0"}, "root")

	err = internal.WrapErrorWithLocf(err, internal.ErrorCodeInvalidArgument, []string{}, "wrapped 1")
	errors.As(err, &ierr)
	assert.Equal(t, []string{"nested", "0"}, ierr.Loc())

	err = internal.WrapErrorWithLocf(err, internal.ErrorCodeNotFound, []string{"parent"}, "wrapped 2")
	errors.As(err, &ierr)
	assert.Equal(t, []string{"parent", "nested", "0"}, ierr.Loc())
	assert.Equal(t, internal.ErrorCodeNotFound, ierr.Code())

	err = internal.WrapErrorWithLocf(errors.New("some error"), internal.ErrorCodeInvalidArgument, []string{"loc"}, "wrapped 1")
	errors.As(err, &ierr)
	assert.Equal(t, []string{"loc"}, ierr.Loc())
}
