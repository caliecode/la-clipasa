import { UserRole } from 'src/graphql/gen'

export const ROLES: Record<UserRole, { rank: number }> = {
  GUEST: {
    rank: 0,
  },
  USER: {
    rank: 1,
  },
  MODERATOR: {
    rank: 2,
  },
  ADMIN: {
    rank: 3,
  },
}
