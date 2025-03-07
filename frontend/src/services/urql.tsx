import { retryExchange } from '@urql/exchange-retry'
import { notifications, showNotification } from '@mantine/notifications'
import Cookies from 'js-cookie'
import { useEffect } from 'react'
import { apiPath } from 'src/services/apiPaths'
import { LOGIN_COOKIE_KEY, useUISlice } from 'src/slices/ui'
import { Client, Exchange, fetchExchange, subscriptionExchange } from 'urql'
import { ToastId } from 'src/utils/toasts'
import { IconForbid, IconX } from '@tabler/icons'

import { pipe, tap } from 'wonka'
import { AxiosApiError, UrqlApiError } from 'src/api/backend-mutator'

export const createUrqlClient = () => {
  return new Client({
    url: apiPath('/graphql'),
    requestPolicy: 'cache-first',
    fetch: async (url, options) => {
      const accessToken = Cookies.get(LOGIN_COOKIE_KEY)
      const headers = {
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
        ...options?.headers,
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      })

      // handle non-200 responses
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const error = new Error(response.statusText)
        ;(error as any).response = response
        ;(error as any).body = body

        // available as error.networkError
        throw new UrqlApiError(error.message, body)
      }

      return response
    },
    exchanges: [
      retryExchange({
        maxNumberAttempts: 2,
        initialDelayMs: 1_000,
        retryIf: (error) => {
          console.log(`urql error: ${error}`)
          if (error?.response?.status === 401 || error?.response?.status === 200) {
            // TODO: also dont retry if unauthorized via directives (error.errors.0.message contains "unauthorized:")
            return false // some parts do not require auth, just don't retry the ones that do
          }
          if (error.networkError) {
            // ERR_TIMED_OUT or ERR_CONNECTION_REFUSED or ERR_CONNECTION_RESET etc.
            // with fly.io, we may have them until it starts, so just retry
            return true
          }
          return true
        },
      }),
      fetchExchange,
    ],
  })
}
