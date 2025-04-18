package testutils

import (
	"errors"
	"testing"

	"github.com/Yamashou/gqlgenc/clientv2"
	"github.com/caliecode/la-clipasa/internal/gql/model"
	"github.com/stretchr/testify/require"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

// AssertGraphQLErrorCodeField checks if any GraphQL error in the response
// contains an extensions.code field with the expected code.
// It specifically targets errors structured by gqlgenc's clientv2.
func AssertGraphQLErrorCodeField(t *testing.T, err error, expectedCode model.ErrorCode) {
	t.Helper()
	require.Error(t, err, "Expected a GraphQL error, but got nil")

	var (
		errResp    *clientv2.ErrorResponse
		gqlErrList *clientv2.GqlErrorList
		gqlErr     *gqlerror.Error

		foundCode    model.ErrorCode
		checkedError bool
	)

	if errors.As(err, &errResp) {
		checkedError = true
		if errResp.GqlErrors != nil && len(*errResp.GqlErrors) > 0 {
			for _, gqlErrItem := range *errResp.GqlErrors {
				if code, ok := GetCodeFromExtensions(gqlErrItem.Extensions); ok {
					if code == expectedCode {
						foundCode = code
						break
					} else if foundCode == "" { // store the first code found if it's not a match yet
						foundCode = code
					}
				}
			}
		} else {
			t.Logf("ErrorResponse contained no GqlErrors. NetworkError: %v", errResp.NetworkError)
		}
	}

	// as GqlErrorList - less common
	if !checkedError && errors.As(err, &gqlErrList) {
		checkedError = true
		if gqlErrList != nil && len(gqlErrList.Errors) > 0 {
			for _, gqlErrItem := range gqlErrList.Errors {
				if code, ok := GetCodeFromExtensions(gqlErrItem.Extensions); ok {
					if code == expectedCode {
						foundCode = code
						break
					} else if foundCode == "" {
						foundCode = code
					}
				}
			}
		}
	}

	// as a single gqlerror.Error (even less common)
	if !checkedError && errors.As(err, &gqlErr) {
		checkedError = true
		if code, ok := GetCodeFromExtensions(gqlErr.Extensions); ok {
			if code == expectedCode {
				foundCode = code
			} else {
				foundCode = code
			}
		}
	}

	if !checkedError {
		require.Failf(t, "Error was not a recognized GraphQL error type (clientv2.ErrorResponse, clientv2.GqlErrorList, or gqlerror.Error)", "Error type: %T, Error: %v", err, err)
		return
	}

	require.Equal(t, expectedCode, foundCode, "Expected GraphQL error code '%s' not found in extensions. Found code: '%s'. Full error: %v", expectedCode, foundCode, err)
}

func GetCodeFromExtensions(extensions map[string]interface{}) (model.ErrorCode, bool) {
	if extensions == nil {
		return "", false
	}
	codeVal, codeOk := extensions["code"]
	if !codeOk {
		return "", false
	}
	return model.ErrorCode(codeVal.(string)), true
}
