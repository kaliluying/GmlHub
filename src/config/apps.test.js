import { describe, expect, it } from 'vitest'
import { getAppGroups } from './apps.js'

describe('app groups', () => {
  it('uses launch mode instead of app names and keeps order within each group', () => {
    const apps = [
      { id: 'tools', launchMode: 'external' },
      { id: 'new-tool', launchMode: 'internal' },
      { id: 'profile', launchMode: 'internal', pluginId: 'personal-info' },
      { id: 'ip-check', launchMode: 'internal' },
    ]
    expect(getAppGroups(apps).map(group => [group.id, group.apps.map(app => app.id)])).toEqual([
      ['tools', ['new-tool', 'ip-check']],
      ['links', ['tools']],
      ['personal', ['profile']],
    ])
    expect(apps.map(app => app.id)).toEqual(['tools', 'new-tool', 'profile', 'ip-check'])
    expect(getAppGroups(apps).flatMap(group => group.apps)).toHaveLength(apps.length)
  })

  it('omits empty groups for filtered search results', () => {
    expect(getAppGroups([])).toEqual([])
    expect(getAppGroups([{ id: 'ip-check', launchMode: 'internal' }]).map(group => group.id)).toEqual(['tools'])
  })
})
