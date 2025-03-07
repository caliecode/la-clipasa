import _ from 'lodash'
import type { ReactNode } from 'react'
import { UserRole } from 'src/graphql/gen'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { checkAuthorization } from 'src/services/authorization'

type ProtectedComponentProps = {
  children: JSX.Element
  requiredRole?: UserRole
}

export default function ProtectedComponent({ children, requiredRole }: ProtectedComponentProps) {
  const { user } = useAuthenticatedUser()

  if (!checkAuthorization({ user, requiredRole }).authorized) return null

  return children
}
