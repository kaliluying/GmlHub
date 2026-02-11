import { defineStore } from 'pinia'
import { ref } from 'vue'

const createInitialDirectories = () => ({
  '/': ['home', 'etc', 'var', 'tmp'],
  '/home': ['gml'],
  '/home/gml': ['projects', 'notes.txt', 'todo.md', '.bashrc'],
  '/home/gml/projects': ['portal-ui', 'tools-api', 'wiki-core'],
})

const createInitialFiles = () => ({
  '/home/gml/notes.txt': 'Portal MVP\n- desktop ui\n- launcher\n- fake terminal',
  '/home/gml/todo.md': '# TODO\n- health api aggregator\n- add auth\n- add audit log',
  '/home/gml/.bashrc': 'export TERM=xterm-256color\nalias ll="ls -la"',
})

export const useVirtualFsStore = defineStore('virtualFs', () => {
  const directories = ref(createInitialDirectories())
  const files = ref(createInitialFiles())

  const reset = () => {
    directories.value = createInitialDirectories()
    files.value = createInitialFiles()
  }

  const resolvePath = (inputPath, cwd = '/home/gml') => {
    if (!inputPath || inputPath === '.') return cwd
    if (inputPath === '~') return '/home/gml'
    if (inputPath.startsWith('~/')) return `/home/gml/${inputPath.slice(2)}`
    const source = inputPath.startsWith('/') ? inputPath : `${cwd}/${inputPath}`
    const parts = source.split('/').filter(Boolean)
    const stack = []

    for (const part of parts) {
      if (part === '.') continue
      if (part === '..') {
        stack.pop()
        continue
      }
      stack.push(part)
    }

    return `/${stack.join('/')}` || '/'
  }

  const isDirectory = (path) => Object.prototype.hasOwnProperty.call(directories.value, path)
  const listDirectory = (path) => directories.value[path] || []
  const fileExists = (path) => Object.prototype.hasOwnProperty.call(files.value, path)
  const readFile = (path) => files.value[path]

  const getParentPath = (path) => {
    if (!path || path === '/') return '/'
    const normalized = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path
    const index = normalized.lastIndexOf('/')
    if (index <= 0) return '/'
    return normalized.slice(0, index)
  }

  const getBaseName = (path) => {
    if (!path || path === '/') return '/'
    const normalized = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path
    return normalized.split('/').filter(Boolean).pop() || '/'
  }

  const addEntryToDirectory = (dirPath, name) => {
    if (!isDirectory(dirPath)) return
    if (!directories.value[dirPath].includes(name)) {
      directories.value[dirPath].push(name)
      directories.value[dirPath].sort((a, b) => a.localeCompare(b, 'en'))
    }
  }

  const removeEntryFromDirectory = (dirPath, name) => {
    if (!isDirectory(dirPath)) return
    directories.value[dirPath] = directories.value[dirPath].filter(item => item !== name)
  }

  const deleteFile = (path) => {
    if (!fileExists(path)) return
    delete files.value[path]
    removeEntryFromDirectory(getParentPath(path), getBaseName(path))
  }

  const writeFile = (path, content = '') => {
    files.value[path] = content
    addEntryToDirectory(getParentPath(path), getBaseName(path))
  }

  const removeDirectoryTree = (dirPath) => {
    const entries = [...listDirectory(dirPath)]
    for (const name of entries) {
      const childPath = dirPath === '/' ? `/${name}` : `${dirPath}/${name}`
      if (isDirectory(childPath)) {
        removeDirectoryTree(childPath)
        continue
      }
      delete files.value[childPath]
    }
    delete directories.value[dirPath]
  }

  const createDirectory = (targetPath) => {
    if (isDirectory(targetPath)) return
    directories.value[targetPath] = []
    addEntryToDirectory(getParentPath(targetPath), getBaseName(targetPath))
  }

  return {
    directories,
    files,
    reset,
    resolvePath,
    isDirectory,
    listDirectory,
    fileExists,
    readFile,
    getParentPath,
    getBaseName,
    addEntryToDirectory,
    removeEntryFromDirectory,
    removeDirectoryTree,
    createDirectory,
    writeFile,
    deleteFile,
  }
})
