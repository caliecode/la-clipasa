import { retryExchange } from '@urql/exchange-retry'
import { notifications, showNotification } from '@mantine/notifications'
import Cookies from 'js-cookie'
import { useEffect } from 'react'
import { apiPath } from 'src/services/apiPaths'
import { LOGIN_COOKIE_KEY, useUISlice } from 'src/slices/ui'
import { Client, CombinedError, Exchange, fetchExchange, subscriptionExchange } from 'urql'
import { ToastId } from 'src/utils/toasts'
import { IconForbid, IconX } from '@tabler/icons'

import { useTranslation } from 'react-i18next' // Import useTranslation
import { pipe, tap } from 'wonka'
import { AxiosApiError, UrqlApiError } from 'src/api/backend-mutator'
import { GraphQLError } from 'graphql'

const isAuthnError = (error: CombinedError): boolean => {
  if (error?.response?.status === 401) {
    return true
  }

  if (error?.graphQLErrors) {
    return error.graphQLErrors.some((gqlError: any) => gqlError?.message?.toLowerCase().includes('unauthenticated'))
  }
  return false
}

const isAuthzError = (error: CombinedError): boolean => {
  if (error?.response?.status === 403) {
    return true
  }

  if (error?.graphQLErrors) {
    return (
      error.graphQLErrors.some((gqlError: any) => gqlError?.message?.toLowerCase().includes('unauthorized')) ||
      error.graphQLErrors.some((gqlError: any) => gqlError?.message?.toLowerCase().includes('forbidden'))
    )
  }
  return false
}

// Note: createUrqlClient cannot use hooks directly. Translations for errors here might need to be handled differently, e.g., passing `t` function or using error codes.
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

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 7_000)

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

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
      } catch (error) {
        clearTimeout(timeoutId)

        if (error.name === 'AbortError') throw new UrqlApiError('Request timeout')

        throw error
      }
    },
    exchanges: [
      retryExchange({
        maxNumberAttempts: 2,
        initialDelayMs: 1_000,
        maxDelayMs: 6_000,
        retryIf: (error) => {
          console.debug(`urql error: ${JSON.stringify(error)}`)
          if (isAuthnError(error)) {
            return true // retry on possible concurrent calls with RT rotation
          }
          if (isAuthzError(error)) {
            return false
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
