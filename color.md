# BasaoPM — Brand Color Palette

Official brand colors. Use these as the primary palette for the UI.

## Core Colors

| Role | Name | HEX | RGB | CMYK |
|------|------|-----|-----|------|
| Primary (dark) | Dark Navy | `#000D6D` | 0 / 13 / 109 | 100 / 97 / 22 / 25 |
| Primary | Blue | `#003AD6` | 0 / 58 / 215 | 89 / 77 / 0 / 0 |
| Secondary | Mint Green | `#43F0A4` | 67 / 240 / 164 | 56 / 0 / 54 / 0 |

## Usage Guidance

- **Blue `#003AD6`** — main interactive color: primary buttons, links, active states, key accents.
- **Dark Navy `#000D6D`** — deep brand tone: headers, sidebar, hover/active of primary blue, strong emphasis, dark surfaces.
- **Mint Green `#43F0A4`** — secondary / complementary accent: highlights, success-adjacent accents, badges, charts, secondary CTAs. Use sparingly for contrast.

## Calibrated Tailwind Ramps

Derived shades for hover/active/background harmony (centered on the brand colors).

### `accent` (Blue — primary)
| Token | HEX | Use |
|-------|-----|-----|
| `accent-50`  | `#E6EDFB` | light tint background / hover surface |
| `accent-100` | `#C2D2F6` | light tint border / chip background |
| `accent-500` | `#003AD6` | **brand blue** — primary interactive |
| `accent-600` | `#0030B0` | hover |
| `accent-700` | `#000D6D` | active / **dark navy** |

### `mint` (Mint Green — secondary)
| Token | HEX | Use |
|-------|-----|-----|
| `mint-50`  | `#E3FCF1` | light tint background |
| `mint-100` | `#BEF7DC` | light tint border / chip |
| `mint-500` | `#43F0A4` | **brand mint** — secondary accent |
| `mint-600` | `#23D586` | hover |
| `mint-700` | `#16A86A` | active |

## Focus Ring
`0 0 0 3px rgba(0, 58, 214, .35)` — based on brand Blue.
