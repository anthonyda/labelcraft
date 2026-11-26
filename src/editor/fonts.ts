/** Fonts for text objects (spec R31). */

export type FontGroup = { name: string; fonts: readonly string[] }

/** R31.AC1: bundled open-licence fonts, then the system ones (AC3). */
export const FONT_GROUPS: readonly FontGroup[] = [
  {
    name: 'Sans',
    fonts: [
      'Inter',
      'Roboto',
      'Open Sans',
      'Montserrat',
      'Lato',
      'IBM Plex Sans',
    ],
  },
  {
    name: 'Condensed',
    fonts: [
      'Roboto Condensed',
      'Oswald',
      'Bebas Neue',
      'IBM Plex Sans Condensed',
    ],
  },
  {
    name: 'Serif',
    fonts: ['Merriweather', 'Playfair Display', 'IBM Plex Serif'],
  },
  {
    name: 'Rounded and fun',
    fonts: ['Nunito', 'Fredoka', 'Lobster', 'Pacifico'],
  },
  { name: 'Handwriting', fonts: ['Caveat', 'Patrick Hand'] },
  {
    name: 'Monospace',
    fonts: ['JetBrains Mono', 'Roboto Mono', 'IBM Plex Mono'],
  },
  { name: 'Pixel', fonts: ['Silkscreen', 'Press Start 2P'] },
  {
    name: 'System (may differ per device)',
    fonts: [
      'Arial',
      'Helvetica',
      'Verdana',
      'Tahoma',
      'Trebuchet MS',
      'Times New Roman',
      'Georgia',
      'Courier New',
      'Impact',
    ],
  },
]

export const FONT_FAMILIES: readonly string[] = FONT_GROUPS.flatMap(
  (g) => g.fonts,
)

/** R31.AC4 */
export const DEFAULT_FONT = 'Inter'
