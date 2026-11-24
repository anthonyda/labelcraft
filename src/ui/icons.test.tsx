import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ICONS, type IconName } from './iconPaths'
import { Button, Icon, Logo } from './icons'

// T6c.1 / R20.AC2, AC5
describe('icons', () => {
  const names = Object.keys(ICONS) as IconName[]

  it.each(names)('%s is a hidden 24 × 24 currentColor svg', (name) => {
    const html = renderToStaticMarkup(<Icon name={name} />)
    expect(html).toMatch(/^<svg class="icon"/)
    expect(html).toContain('viewBox="0 0 24 24"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('stroke="currentColor"')
    // No fixed colours: only currentColor or none.
    const colours = [...html.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map(
      (m) => m[1],
    )
    expect(colours.every((c) => c === 'currentColor' || c === 'none')).toBe(
      true,
    )
  })

  it('has no duplicate drawings', () => {
    const paths = Object.values(ICONS)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('puts the icon before the text in a button', () => {
    const html = renderToStaticMarkup(<Button icon="undo">Undo</Button>)
    expect(html).toMatch(
      /^<button type="button"><svg class="icon"[^]*<\/svg>Undo<\/button>$/,
    )
  })

  it('logo uses currentColor only', () => {
    const html = renderToStaticMarkup(<Logo />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toMatch(/#[0-9a-f]{3,6}/i)
  })
})
