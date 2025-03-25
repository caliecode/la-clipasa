import { parseUrl } from 'src/ui-paths'

export function isValidURL(str: string) {
  try {
    new URL(str)
    return true
  } catch (error) {
    return false
  }
}

export function withBaseURL(url?: string | null) {
  if (url?.startsWith('/')) {
    return `${import.meta.env.BASE_URL}${url}`
  }
  return url || ''
}

export const getPostIdFromRoute = () => parseUrl(window.location.href)?.match.params.postId
