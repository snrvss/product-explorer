import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * WCAG AA contrast of the colour tokens, for the light and the dark theme. Reads the SCSS files,
 * so changing a palette value that breaks a pair fails here instead of in an accessibility audit.
 * (Read from disk: Vitest replaces CSS imports, including `?raw`, with empty strings.)
 */

const tokensDir = dirname(fileURLToPath(import.meta.url))
const palette = readFileSync(join(tokensDir, '_palette.scss'), 'utf8')
const colors = readFileSync(join(tokensDir, '_colors.scss'), 'utf8')

/** `$name: #rrggbb;` lines of the palette */
const primitives = new Map(
  [...palette.matchAll(/^\$([\w-]+):\s*(#[0-9a-f]{6});/gim)].map(([, name, hex]) => [name, hex]),
)

/** `'token': $primitive` entries of one theme map (`$light: (…)` or `$dark: (…)`) */
function readTheme(theme: 'light' | 'dark'): Map<string, string> {
  const block = colors.match(new RegExp(String.raw`\$${theme}: \(([\s\S]*?)\n\);`))?.[1] ?? ''
  const tokens = new Map<string, string>()
  for (const [, token, primitive] of block.matchAll(/'([\w-]+)':\s*\$([\w-]+)\s*,?$/gm)) {
    const hex = primitives.get(primitive!)
    if (hex) {
      tokens.set(token!, hex)
    }
  }
  return tokens
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light! + 0.05) / (dark! + 0.05)
}

/** Text on a background: at least 4.5:1 */
const TEXT_PAIRS = [
  ['text', 'background'],
  ['text', 'background-alt'],
  ['text', 'surface'],
  ['text', 'surface-chip'],
  ['text-secondary', 'background'],
  ['text-secondary', 'surface'],
  ['text-muted', 'background'],
  ['text-muted', 'surface'],
  ['primary-text', 'background'],
  ['primary-text', 'surface'],
  ['on-primary', 'primary'],
  ['on-primary', 'primary-hover'],
  ['danger', 'danger-surface'],
  ['danger', 'surface'],
  ['warning', 'warning-surface'],
] as const

/** Input borders and the focus ring against what they sit on: at least 3:1 */
const UI_PAIRS = [
  ['border-strong', 'background'],
  ['border-strong', 'surface'],
  ['focus-ring', 'background'],
  ['focus-ring', 'surface'],
] as const

describe.each(['light', 'dark'] as const)('%s theme colour contrast', (theme) => {
  const tokens = readTheme(theme)

  it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (foreground, background) => {
    const ratio = contrast(tokens.get(foreground)!, tokens.get(background)!)

    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_PAIRS)('%s on %s reaches 3:1', (foreground, background) => {
    const ratio = contrast(tokens.get(foreground)!, tokens.get(background)!)

    expect(ratio).toBeGreaterThanOrEqual(3)
  })
})
