export const DEFAULT_SETTINGS = Object.freeze({
  wallpaper: 'deep-net',
  wallpaperColor: '#1a1a2e',
  showDock: true,
  showServiceReadout: true,
  dockPosition: 'bottom',
  iconSize: 'medium',
  motionLevel: 'medium',
  codeRainEnabled: true,
  dockAnimationLevel: 'medium',
  terminalFontSize: 'medium',
  terminalHistoryLimit: 100,
  terminalEasterEggsEnabled: true,
  autoStartMonitoring: true,
  statusMonitorIntervalMs: 45000,
})

const VALID_ICON_SIZES = new Set(['small', 'medium', 'large'])
const VALID_DOCK_POSITIONS = new Set(['bottom'])
const VALID_MOTION_LEVELS = new Set(['low', 'medium', 'high'])
const VALID_HISTORY_LIMITS = new Set([30, 100, 300])
const VALID_MONITOR_INTERVALS = new Set([15000, 30000, 45000, 60000])

export const createDefaultSettings = () => ({ ...DEFAULT_SETTINGS })

export const normalizeSettings = (value) => {
  const parsed = value && typeof value === 'object' ? value : {}
  const defaults = DEFAULT_SETTINGS

  return {
    wallpaper: typeof parsed.wallpaper === 'string' ? parsed.wallpaper : defaults.wallpaper,
    wallpaperColor: typeof parsed.wallpaperColor === 'string' ? parsed.wallpaperColor : defaults.wallpaperColor,
    showDock: typeof parsed.showDock === 'boolean' ? parsed.showDock : defaults.showDock,
    showServiceReadout: typeof parsed.showServiceReadout === 'boolean'
      ? parsed.showServiceReadout
      : defaults.showServiceReadout,
    dockPosition: VALID_DOCK_POSITIONS.has(parsed.dockPosition) ? parsed.dockPosition : defaults.dockPosition,
    iconSize: VALID_ICON_SIZES.has(parsed.iconSize) ? parsed.iconSize : defaults.iconSize,
    motionLevel: VALID_MOTION_LEVELS.has(parsed.motionLevel) ? parsed.motionLevel : defaults.motionLevel,
    codeRainEnabled: typeof parsed.codeRainEnabled === 'boolean' ? parsed.codeRainEnabled : defaults.codeRainEnabled,
    dockAnimationLevel: VALID_MOTION_LEVELS.has(parsed.dockAnimationLevel) ? parsed.dockAnimationLevel : defaults.dockAnimationLevel,
    terminalFontSize: VALID_ICON_SIZES.has(parsed.terminalFontSize) ? parsed.terminalFontSize : defaults.terminalFontSize,
    terminalHistoryLimit: VALID_HISTORY_LIMITS.has(parsed.terminalHistoryLimit) ? parsed.terminalHistoryLimit : defaults.terminalHistoryLimit,
    terminalEasterEggsEnabled: typeof parsed.terminalEasterEggsEnabled === 'boolean'
      ? parsed.terminalEasterEggsEnabled
      : defaults.terminalEasterEggsEnabled,
    autoStartMonitoring: typeof parsed.autoStartMonitoring === 'boolean'
      ? parsed.autoStartMonitoring
      : defaults.autoStartMonitoring,
    statusMonitorIntervalMs: VALID_MONITOR_INTERVALS.has(parsed.statusMonitorIntervalMs)
      ? parsed.statusMonitorIntervalMs
      : defaults.statusMonitorIntervalMs,
  }
}
