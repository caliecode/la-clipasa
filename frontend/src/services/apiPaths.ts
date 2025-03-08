export function apiPath(path?: string) {
  const port =
    import.meta.env.DEV && import.meta.env.VITE_API_PORT?.length > 0 ? `:${import.meta.env.VITE_API_PORT}` : ''
  return `https://${import.meta.env.VITE_DOMAIN}${port}${import.meta.env.VITE_REVERSE_PROXY_API_PREFIX}${
    import.meta.env.VITE_API_VERSION
  }${path ?? ''}`
}
