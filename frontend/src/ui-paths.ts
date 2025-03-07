import { generatePath } from 'react-router-dom'

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
