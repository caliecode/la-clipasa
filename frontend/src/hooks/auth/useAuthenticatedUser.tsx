import { notifications, showNotification } from '@mantine/notifications'
import { IconForbid, IconX } from '@tabler/icons'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Cookies from 'js-cookie'
import { useEffect, useRef, useState } from 'react'
import { AxiosApiError, AXIOS_INSTANCE, UrqlApiError } from 'src/api/backend-mutator'
import { useMeQuery } from 'src/graphql/gen'
import useRenders from 'src/hooks/utils/useRenders'
import { useAuthSlice } from 'src/slices/auth'
import { LOGIN_COOKIE_KEY, UI_SLICE_PERSIST_KEY, useUISlice } from 'src/slices/ui'
import AxiosInterceptors from 'src/utils/axios'
import HttpStatus from 'src/utils/httpStatus'
import { ToastId } from 'src/utils/toasts'
import { useIsFirstRender } from 'usehooks-ts'

let isFirstRender = false

export default function useAuthenticatedUser() {
  const queryClient = useQueryClient()
  const { user, actions } = useAuthSlice()
  const [failedAuthentication, setFailedAuthentication] = useState(false)
  const [currentUser, fetchCurrentUser] = useMeQuery({ requestPolicy: 'cache-first', pause: true })
  const renders = useRenders()
  const ui = useUISlice()
  const isAuthenticated = useAuthSlice((state) => state.user !== null)
  const isAuthenticating = currentUser.fetching && ui.accessToken !== ''

  useEffect(() => {
    actions.setIsLoading(
      currentUser.fetching ||
        !!(currentUser.error && currentUser.error.response.status !== HttpStatus.UNAUTHORIZED_401),
    )
    if (!isFirstRender) {
      isFirstRender = true
      console.log('Fetching user on initial render')
      fetchCurrentUser()
    }
  }, [ui.accessToken, fetchCurrentUser])

  useEffect(() => {
    currentUser.data?.me && actions.setUser(currentUser.data?.me)
  }, [currentUser.data, actions])

  useEffect(() => {
    if (failedAuthentication) {
      notifications.show({
        id: ToastId.AuthnError,
        title: `Login error`,
        color: 'red',
        icon: <IconX size="1.2rem" />,
        autoClose: 15000,
        message: `We're having trouble login you in from your previous session. Please log in again`,
      })
    }

    AxiosInterceptors.setupAxiosInstance(AXIOS_INSTANCE, ui.accessToken)

    return () => {
      AxiosInterceptors.teardownAxiosInstance(AXIOS_INSTANCE)
    }
  }, [currentUser.data, isAuthenticated, ui.accessToken, failedAuthentication, fetchCurrentUser])

  useEffect(() => {
    if (user) {
      setFailedAuthentication(false)
    }
    const error = currentUser.error?.networkError
    if (error) {
      if (error instanceof UrqlApiError) {
        // TODO: when calling twitchHandlers.signOutUser we should return the specific twitch error
        // (cookie missing, expired token and cannot refresh if user revokes,changes some info, etc.)
        // this is currently swallowed and we just get the generic no auth header present since theres no cookie
        // if (error.response?.detail === 'no auth header present') {
        //   setFailedAuthentication(true)
        // }
      }
      console.log('Current user error', JSON.stringify(currentUser.error))
    }
  }, [user, currentUser.error])

  return {
    isAuthenticated,
    isAuthenticating,
    isLoggingOut: ui.isLoggingOut,
    user, // re-export for convenience
    refetchUser: () => {
      fetchCurrentUser()
    },
  }
}

// TODO doesnt seem to clear react query
export async function logUserOut(queryClient: QueryClient) {
  Cookies.remove(LOGIN_COOKIE_KEY, {
    expires: 365,
    sameSite: 'none',
    secure: true,
  })
  await queryClient.cancelQueries()
  await queryClient.invalidateQueries()
  queryClient.clear()
  localStorage.removeItem(UI_SLICE_PERSIST_KEY)
  window.location.reload()
}

/**
 * To ensure a useEffect is only called once for shared hooks.
 */
export function useMountedRef() {
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  return mounted
}
