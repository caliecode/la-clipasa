import { generatePath, matchPath } from 'react-router-dom'
import { entries } from 'src/utils/object'
import { toPathname, withBaseURL } from 'src/utils/urls'

const routes = {
  404: '*',
  HOME: '/',
  POST_ID: '/post/:postId',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users-management',
  ADMIN_POSTS: '/admin/posts-management',
  PROFILE: '/profile',
} as const

export type UiRoutes = (typeof routes)[keyof typeof routes] // "/users" | "/users/:userId"

export function uiPath<P extends UiRoutes>(...args: Parameters<typeof generatePath<P>>): string {
  return generatePath(...args)
}

const a = uiPath('/post/:postId', { postId: '1' })

/**
 * Parses a URL and returns the matching route pattern and params
 */
export function parseUrl(url: string) {
  const urlObj = new URL(url)
  const path = urlObj.pathname.split(import.meta.env.BASE_URL || '').pop() || ''

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

console.log(parseUrl('https://localhost:3000/post/b2b16319-a1a6-422e-b380-55120bc823c0')?.match)
