/**
 *
 * Based on openlane core:
 */

package gql

import (
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"github.com/rs/zerolog/log"

	"github.com/laclipasa/la-clipasa/internal/ent/generated"
	"github.com/laclipasa/la-clipasa/internal/ent/generated/privacy"
)

var (
	// ErrInternalServerError is returned when an internal error occurs.
	ErrInternalServerError = errors.New("internal server error")

	// ErrCascadeDelete is returned when an error occurs while performing cascade deletes on associated objects.
	ErrCascadeDelete = errors.New("error deleting associated objects")

	// ErrSearchFailed is returned when the search operation fails.
	ErrSearchFailed = errors.New("search failed, please try again")

	// ErrSearchQueryTooShort is returned when the search query is too short.
	ErrSearchQueryTooShort = errors.New("search query is too short, please enter a longer search query")

	// ErrNoOrganizationID is returned when the organization ID is not provided.
	ErrNoOrganizationID = errors.New("unable to determine organization ID in request")

	// ErrUnableToDetermineObjectType is returned when the object type up the parent upload object cannot be determined.
	ErrUnableToDetermineObjectType = errors.New("unable to determine parent object type")
)

// NotFoundError is returned when the requested object is not found.
type NotFoundError struct {
	ObjectType string
}

// Error returns the NotFoundError in string format.
func (e *NotFoundError) Error() string {
	return e.ObjectType + " not found"
}

// newPermissionDeniedError returns a NotFoundError.
func newNotFoundError(o string) *NotFoundError {
	return &NotFoundError{
		ObjectType: o,
	}
}

func newCascadeDeleteError(err error) error {
	return fmt.Errorf("%w: %w", ErrCascadeDelete, err)
}

// AlreadyExistsError is returned when an object already exists.
type AlreadyExistsError struct {
	ObjectType string
}

// Error returns the AlreadyExistsError in string format.
func (e *AlreadyExistsError) Error() string {
	return e.ObjectType + " already exists"
}

// newAlreadyExistsError returns a AlreadyExistsError.
func newAlreadyExistsError(o string) *AlreadyExistsError {
	return &AlreadyExistsError{
		ObjectType: o,
	}
}

type action struct {
	object string
	action Action
}

// ForeignKeyError is returned when an object does not exist in the related table.
type ForeignKeyError struct {
	Action     Action
	ObjectType string
}

// Error returns the ForeignKeyError in string format.
func (e *ForeignKeyError) Error() string {
	if e.ObjectType == "" {
		return fmt.Sprintf("constraint failed, unable to complete the %s", e.Action)
	}

	return fmt.Sprintf("constraint failed, unable to complete the %s because the '%s' record does not exist", e.Action, e.ObjectType)
}

// newForeignKeyError returns a ForeignKeyError.
func newForeignKeyError(action Action, objecttype string) *ForeignKeyError {
	return &ForeignKeyError{
		Action:     action,
		ObjectType: objecttype,
	}
}

// parseRequestError logs and parses the error and returns the appropriate error type for the client
// TODO: cleanup return error messages.
func parseRequestError(err error, a action) error {
	// log the error for debugging
	log.Error().
		Err(err).
		Str("action", string(a.action)).
		Str("object", a.object).
		Msg("error processing request")

	switch {
	case generated.IsValidationError(err):
		validationError := err.(*generated.ValidationError)

		log.Debug().
			Err(validationError).
			Str("field", validationError.Name).
			Msg("validation error")

		return validationError
	case generated.IsConstraintError(err):
		constraintError := err.(*generated.ConstraintError)

		log.Debug().Err(constraintError).Msg("constraint error")

		// Check for unique constraint error
		if strings.Contains(strings.ToLower(constraintError.Error()), "unique") {
			return newAlreadyExistsError(a.object)
		}

		// Check for foreign key constraint error
		if IsForeignKeyConstraintError(constraintError) {
			object := getConstraintField(constraintError, a.object)

			return newForeignKeyError(a.action, object)
		}

		return constraintError
	case generated.IsNotFound(err):
		log.Debug().Err(err).Msg("request object was not found")

		return newNotFoundError(a.object)
	case errors.Is(err, privacy.Deny):
		log.Debug().Err(err).Msg("user has no access to the requested object")

		return newNotFoundError(a.object)
	default:
		log.Error().Err(err).Msg("unexpected error occurred")

		return err
	}
}

// IsForeignKeyConstraintError reports if the error resulted from a database foreign-key constraint violation.
// e.g. parent row does not exist.
func IsForeignKeyConstraintError(err error) bool {
	if err == nil {
		return false
	}

	for _, s := range []string{
		"Error 1451",                      // MySQL (Cannot delete or update a parent row).
		"Error 1452",                      // MySQL (Cannot add or update a child row).
		"violates foreign key constraint", // Postgres
		"FOREIGN KEY constraint failed",   // SQLite
	} {
		if strings.Contains(err.Error(), s) {
			return true
		}
	}

	return false
}

// getConstraintField returns the field that caused the constraint error
// this currently only works for postgres errors, which is the supported database of this project.
func getConstraintField(err error, object string) string {
	unwrappedErr := errors.Unwrap(err)     // Unwrap the error to get the underlying error
	dbError := errors.Unwrap(unwrappedErr) // Unwrap again to get the postgres error

	if postgresError, ok := dbError.(*pq.Error); ok {
		// the Table will be the object_edge so we need to remove the object_ prefix
		return strings.ReplaceAll(postgresError.Table, object+"_", "")
	}

	return ""
}
