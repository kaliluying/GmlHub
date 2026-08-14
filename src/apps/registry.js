import { defineAsyncComponent } from 'vue'

const appPlugins = new Map()

export const registerAppPlugin = (plugin) => {
  if (!plugin || typeof plugin.id !== 'string' || !plugin.component) return false
  appPlugins.set(plugin.id, plugin)
  return true
}

export const registerAppPlugins = (plugins = []) => {
  plugins.forEach(registerAppPlugin)
}

export const getAppPlugin = (id) => appPlugins.get(id) || null

registerAppPlugins([
  {
    id: 'terminal',
    component: defineAsyncComponent(() => import('../components/desktop/TerminalPanel.vue')),
    getProps: ({ window }) => ({ windowId: window.id }),
  },
  {
    id: 'settings',
    component: defineAsyncComponent(() => import('../components/desktop/SettingsPanel.vue')),
  },
  {
    id: 'trash',
    component: defineAsyncComponent(() => import('../components/desktop/TrashPanel.vue')),
  },
  {
    id: 'personal-info',
    component: defineAsyncComponent(() => import('../components/desktop/PersonalInfoPanel.vue')),
    getProps: ({ window }) => ({ windowData: window }),
  },
  {
    id: 'project',
    component: defineAsyncComponent(() => import('../components/desktop/ProjectPanel.vue')),
    getProps: ({ window }) => ({ windowData: window }),
  },
])
