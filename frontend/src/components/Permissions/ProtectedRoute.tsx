import ProtectedPage from './ProtectedPage'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ToastId } from 'src/utils/toasts'
import { useUISlice } from 'src/slices/ui'
import useAuthenticatedUser from 'src/hooks/auth/useAuthenticatedUser'
import { useEffect, useState } from 'react'
import { Authorization, checkAuthorization, redirectToUserAuthLogin } from 'src/services/authorization'
import { apiPath } from 'src/services/apiPaths'
import { notifications } from '@mantine/notifications'
import { joinWithAnd } from 'src/utils/format'
import { UserRole } from 'src/graphql/gen'

type ProtectedRouteProps = {
  children: JSX.Element
  requiredRole?: UserRole
}

/**
 *  Requires an authenticated user and optionally specific role or scopes.
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthenticatedUser()
  const ui = useUISlice()

  const authResult = checkAuthorization({ user, requiredRole })

  // if (!isAuthenticated && !currentUser.isFetching) {
  //   redirectToAuthLogin();
  // }

  return <ProtectedPage authResult={authResult}>{children}</ProtectedPage>
}
