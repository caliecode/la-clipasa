import { UserRole } from 'src/graphql/gen'
import { checkAuthorization } from 'src/services/authorization'
import { describe, expect, it, test } from 'vitest'

describe('roles and scopes', async () => {
  const user = {} as {
    role: UserRole
  }

  test('role', () => {
    user.role = 'USER'
    const resultAdmin = checkAuthorization({ user, requiredRole: 'ADMIN' })
    const resultUser = checkAuthorization({ user, requiredRole: 'USER' })

    expect(resultAdmin.authorized).toBe(false)
    expect(resultAdmin.missingRole).toBe('ADMIN')

    expect(resultUser.authorized).toBe(true)
    expect(resultUser.missingRole).toBeUndefined()
  })

  test('default authorized', () => {
    const result = checkAuthorization({ user })

    expect(result.authorized).toBe(true)
    expect(result.missingRole).toBeUndefined()
  })

  test('no user unauthorized', () => {
    const result = checkAuthorization({ user: undefined })

    expect(result.authorized).toBe(false)
    expect(result.missingRole).toBeUndefined()
  })
})
