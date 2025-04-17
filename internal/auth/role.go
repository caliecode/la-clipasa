package auth

import (
	"github.com/caliecode/la-clipasa/internal/ent/generated"
	"github.com/caliecode/la-clipasa/internal/ent/generated/user"
)

// Role ranks by user role.
type roleRank struct {
	m map[user.Role]int
}

func (r roleRank) Get(role user.Role) int {
	return r.m[role]
}

func IsAuthorized(u *generated.User, role user.Role) bool {
	if u == nil {
		return false
	}
	return RoleRank.Get(u.Role) > RoleRank.Get(role)
}

var RoleRank = roleRank{
	m: map[user.Role]int{
		user.RoleGUEST:     0,
		user.RoleUSER:      1,
		user.RoleMODERATOR: 2,
		user.RoleADMIN:     3,
	},
}
