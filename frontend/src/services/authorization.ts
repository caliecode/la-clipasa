import { ROLES } from 'src/config'
import { UserRole } from 'src/graphql/gen'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { apiPath } from 'src/services/apiPaths'
import { joinWithAnd } from 'src/utils/format'
import { keys } from 'src/utils/object'

interface CheckAuthorizationParams {
  user?: {
    role: UserRole
  } | null
  requiredRole?: UserRole | null
}

export interface Authorization {
  authorized: boolean
  missingRole?: UserRole
  errorMessage?: string
}

export function checkAuthorization({ user, requiredRole = null }: CheckAuthorizationParams): Authorization {
  const result: Authorization = {
    authorized: false,
  }

  if (!user) {
    result.errorMessage = 'User not authenticated. Please log in'
    return result
  }

  if (requiredRole !== null) {
    if (ROLES[user.role].rank < ROLES[requiredRole].rank) {
      result.missingRole = requiredRole
    }
  }

  if (result.missingRole) {
    result.errorMessage = getUnauthorizedMessage(result)
    result.authorized = false
    return result
  }

  result.authorized = true
  return result
}

export const redirectToUserAuthLogin = () => {
  window.location.replace(
    `${apiPath('/auth/twitch/login')}?auth:login-mode=user&auth:redirect-uri=${encodeURIComponent(window.location.href)}`,
  )
}

/**
 * Once the broadcaster logs in via user login, a separate login button will be shown
 * with a different oauth flow to allow for api queries with refresh token
 */
export const redirectToBroadcasterAuthLogin = () => {
  window.location.replace(
    `${apiPath('/auth/twitch/login')}?auth:login-mode=broadcaster&auth:redirect-uri=${encodeURIComponent(window.location.href)}`,
  )
}
const getUnauthorizedMessage = (authResult: Authorization): string => {
  if (!authResult.authorized) {
    const messages: string[] = []

    if (authResult.missingRole) {
      messages.push(`missing role ${authResult.missingRole}`)
    }

    return joinWithAnd(messages)
  }

  return ''
}
