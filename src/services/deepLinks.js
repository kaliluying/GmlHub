const APP_ROUTE_PATTERN = /^#\/app\/([^/?#]+)$/

export const getAppRoute = () => {
  if (typeof window === 'undefined') return null
  const match = window.location.hash.match(APP_ROUTE_PATTERN)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

export const navigateToApp = (appId, { replace = false } = {}) => {
  if (typeof window === 'undefined' || !appId) return
  const hash = `#/app/${encodeURIComponent(appId)}`

  if (replace) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
    return
  }

  if (window.location.hash !== hash) window.location.hash = hash
}

export const clearAppRoute = () => {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}
