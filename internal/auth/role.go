package auth

import "github.com/caliecode/la-clipasa/internal/ent/generated/user"

// Role ranks by user role.
type roleRank struct {
	m map[user.Role]int
}

func (r roleRank) Get(role user.Role) int {
	return r.m[role]
}

var RoleRank = roleRank{
	m: map[user.Role]int{
		user.RoleUSER:      0,
		user.RoleMODERATOR: 1,
		user.RoleADMIN:     2,
	},
}
