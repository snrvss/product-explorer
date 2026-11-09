import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Resolves `@/…` to the `src` folder of the package that contains the importing file.
 *
 * @remarks
 * A plain Vite alias maps `@` to one fixed folder. In this monorepo the app compiles core's source
 * directly, so `@/fields` inside a core file must point to `packages/core/src/fields`, while
 * `@/components` inside an app file must point to `packages/app/src/components`.
 *
 * @returns The Vite plugin
 */
export function srcAlias(): Plugin {
  const packageRoots = new Map<string, string | null>()

  function findPackageRoot(file: string): string | null {
    const start = dirname(file)
    if (packageRoots.has(start)) {
      return packageRoots.get(start) ?? null
    }
    let dir = start
    while (!existsSync(join(dir, 'package.json'))) {
      const parent = dirname(dir)
      if (parent === dir) {
        packageRoots.set(start, null)
        return null
      }
      dir = parent
    }
    packageRoots.set(start, dir)
    return dir
  }

  return {
    name: 'product-explorer:src-alias',
    enforce: 'pre',
    resolveId(source, importer, options) {
      if (!source.startsWith('@/') || !importer) {
        return null
      }
      const root = findPackageRoot(importer.split('?')[0] ?? importer)
      if (!root) {
        return null
      }
      return this.resolve(join(root, 'src', source.slice(2)), importer, {
        ...options,
        skipSelf: true,
      })
    },
  }
}
