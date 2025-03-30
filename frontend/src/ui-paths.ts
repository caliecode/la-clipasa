import { generatePath, matchPath } from 'react-router-dom'
import { entries } from 'src/utils/object'

const routes = {
  404: '*',
  HOME: '/',
  POST_ID: '/post/:postId',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users-management',
  ADMIN_POSTS: '/admin/posts-management',
  PROFILE: '/profile',
} as const

export type UiRoutes = (typeof routes)[keyof typeof routes]

/**
 * Returns the UI path for a given route excluding the base URL
 */
export function uiPath<P extends UiRoutes>(...args: Parameters<typeof generatePath<P>>): string {
  return generatePath(...args)
}

/**
 * Parses a URL and returns the matching route pattern and params
 */
export function parseUrl(url: string) {
  const urlObj = new URL(url)
  const path = urlObj.pathname.split(import.meta.env.BASE_URL).pop() || '/'

  for (const [routeName, routePattern] of entries(routes)) {
    if (routePattern === '*') {
      continue
    }
    const match = matchPath(
      {
        path: routePattern,
      },
      toPathname(path),
    )

    if (match) {
      return {
        match,
        routePattern,
      }
    }
  }

  return null
}

export function toPathname(url?: string | null) {
  return url?.replace(import.meta.env.BASE_URL, '') || ''
}
