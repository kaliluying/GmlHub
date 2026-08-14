import { createDefaultSettings, normalizeSettings } from '../config/settings.js'

export const PORTAL_STATE_STORAGE_KEY = 'gmlhub.portal.state'
export const PORTAL_STATE_VERSION = 1

const LEGACY_STORAGE_KEYS = {
  pinnedAppIds: 'desktop.pinnedApps',
  recentAppIds: 'desktop.recentApps',
  settings: 'desktop.settings',
  trashedAppIds: 'desktop.trashedApps',
  removedAppIds: 'desktop.removedApps',
  appOrder: 'desktop.appOrder',
}

const emptyState = () => ({
  schemaVersion: PORTAL_STATE_VERSION,
  pinnedAppIds: [],
  recentAppIds: [],
  trashedAppIds: [],
  removedAppIds: [],
  appOrder: [],
  settings: createDefaultSettings(),
  windows: [],
})

const parseStorageValue = (storage, key) => {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const readLegacyState = (storage) => {
  const legacy = emptyState()
  let found = false

  Object.entries(LEGACY_STORAGE_KEYS).forEach(([field, key]) => {
    const value = parseStorageValue(storage, key)
    if (value === null) return
    found = true
    if (field === 'settings') {
      legacy.settings = normalizeSettings(value)
      return
    }
    if (Array.isArray(value)) legacy[field] = value
  })

  return found ? legacy : null
}

const normalizeIdList = (value, validAppIds, limit = Infinity) => {
  if (!Array.isArray(value)) return []
  return [...new Set(value)]
    .filter(id => typeof id === 'string' && (!validAppIds || validAppIds.has(id)))
    .slice(0, limit)
}

const normalizeWindow = (value, validAppIds) => {
  if (!value || typeof value !== 'object') return null
  if (typeof value.appId !== 'string' || !validAppIds.has(value.appId)) return null

  const numeric = (field, fallback) => {
    const number = Number(value[field])
    return Number.isFinite(number) ? number : fallback
  }

  return {
    appId: value.appId,
    x: numeric('x', 100),
    y: numeric('y', 100),
    width: numeric('width', 900),
    height: numeric('height', 600),
    minimized: Boolean(value.minimized),
    maximized: Boolean(value.maximized),
    prevX: numeric('prevX', 100),
    prevY: numeric('prevY', 100),
    prevWidth: numeric('prevWidth', 900),
    prevHeight: numeric('prevHeight', 600),
    zIndex: numeric('zIndex', 100),
  }
}

const normalizeState = (value, validAppIds) => {
  const source = value && typeof value === 'object' ? value : {}
  const state = emptyState()

  state.schemaVersion = PORTAL_STATE_VERSION
  state.pinnedAppIds = normalizeIdList(source.pinnedAppIds, validAppIds, 8)
  state.recentAppIds = normalizeIdList(source.recentAppIds, validAppIds, 8)
  state.trashedAppIds = normalizeIdList(source.trashedAppIds, validAppIds)
  state.removedAppIds = normalizeIdList(source.removedAppIds, validAppIds)
  state.appOrder = normalizeIdList(source.appOrder, validAppIds)
  state.settings = normalizeSettings(source.settings)
  state.windows = Array.isArray(source.windows)
    ? source.windows.map(window => normalizeWindow(window, validAppIds)).filter(Boolean).slice(0, 12)
    : []

  return state
}

export const loadPortalState = ({ validAppIds }) => {
  if (typeof window === 'undefined' || !window.localStorage) return emptyState()

  const storage = window.localStorage
  const persisted = parseStorageValue(storage, PORTAL_STATE_STORAGE_KEY)
  const legacy = persisted ? null : readLegacyState(storage)
  const state = normalizeState(persisted || legacy, validAppIds)

  if (legacy && !persisted) {
    savePortalState(state)
  }

  return state
}

export const savePortalState = (value) => {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    window.localStorage.setItem(PORTAL_STATE_STORAGE_KEY, JSON.stringify({
      ...value,
      schemaVersion: PORTAL_STATE_VERSION,
    }))
  } catch {
    // Storage is an enhancement; the desktop remains usable when it is unavailable.
  }
}
