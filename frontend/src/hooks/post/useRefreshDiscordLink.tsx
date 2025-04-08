import { useCallback, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { PostFragment, useRefreshDiscordLinkMutation } from 'src/graphql/gen'
import { extractGqlErrors } from 'src/utils/errors'

interface UseDiscordLinkRefreshOptions {
  onRefresh?: (newLink: string) => void
  onError?: (errors: any) => void
}
export const useDiscordLinkRefresh = (options?: UseDiscordLinkRefreshOptions) => {
  const [refreshState, refreshDiscordLink] = useRefreshDiscordLinkMutation()
  const [refreshed, setRefreshed] = useState(false)
  const isRefreshingRef = useRef(false)

  const refreshLink = useCallback(
    async (post: PostFragment) => {
      if (
        !refreshed &&
        !refreshState.fetching &&
        !refreshState.error &&
        !isRefreshingRef.current &&
        post?.metadata?.service === 'DISCORD' &&
        post.metadata?.discord?.expiration &&
        dayjs(post.metadata.discord.expiration).isBefore(dayjs())
      ) {
        try {
          isRefreshingRef.current = true
          const res = await refreshDiscordLink({ id: post.id })
          const newLink = res.data?.refreshDiscordLink

          if (newLink && options?.onRefresh) {
            options.onRefresh(newLink)
          }

          if (res.error && options?.onError) {
            options.onError(extractGqlErrors(res.error?.graphQLErrors))
          }

          setRefreshed(true) // prevent all further calls
          return newLink
        } finally {
          isRefreshingRef.current = false
        }
      }

      return null
    },
    [refreshed, refreshState.fetching, refreshState.error, refreshDiscordLink, options],
  )

  const resetRefreshState = useCallback(() => {
    setRefreshed(false)
  }, [])

  return {
    refreshLink,
    resetRefreshState,
    isRefreshing: refreshState.fetching || isRefreshingRef.current,
    refreshError: refreshState.error,
    hasRefreshed: refreshed,
  }
}
