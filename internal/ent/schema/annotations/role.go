package annotations

import (
	"entgo.io/contrib/entgql"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
	"github.com/vektah/gqlparser/v2/ast"
)

// TODO: see theopenlane/core internal/ent/schema/mixin_userowned.go:87 to allow owners to mutate.
func HasRoleDirective(role user.Role) entgql.Directive {
	var args []*ast.Argument
	if role != "" {
		args = append(args, &ast.Argument{
			Name: "role",
			Value: &ast.Value{
				Raw:  string(role),
				Kind: ast.EnumValue,
			},
		})
	}
	return entgql.NewDirective("hasRole", args...)
}
