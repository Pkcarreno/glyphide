---
name: Bit-Perfect Noir
colors:
  surface: '#11140c'
  surface-dim: '#11140c'
  surface-bright: '#373a30'
  surface-container-lowest: '#0c0f07'
  surface-container-low: '#1a1d13'
  surface-container: '#1e2117'
  surface-container-high: '#282b21'
  surface-container-highest: '#33362b'
  on-surface: '#e2e4d4'
  on-surface-variant: '#c3c9b2'
  inverse-surface: '#e2e4d4'
  inverse-on-surface: '#2e3227'
  outline: '#8d937e'
  outline-variant: '#434937'
  surface-tint: '#a4d64b'
  primary: '#fefff1'
  on-primary: '#233600'
  primary-container: '#bef263'
  on-primary-container: '#4b6e00'
  inverse-primary: '#476800'
  secondary: '#c5c8ba'
  on-secondary: '#2e3228'
  secondary-container: '#474a40'
  on-secondary-container: '#b7baad'
  tertiary: '#fffeff'
  on-tertiary: '#362b47'
  tertiary-container: '#ebdbff'
  on-tertiary-container: '#6a5e7d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bff364'
  primary-fixed-dim: '#a4d64b'
  on-primary-fixed: '#131f00'
  on-primary-fixed-variant: '#354e00'
  secondary-fixed: '#e2e4d6'
  secondary-fixed-dim: '#c5c8ba'
  on-secondary-fixed: '#1a1d14'
  on-secondary-fixed-variant: '#45483e'
  tertiary-fixed: '#ecdcff'
  tertiary-fixed-dim: '#cfc0e3'
  on-tertiary-fixed: '#201731'
  on-tertiary-fixed-variant: '#4d425e'
  background: '#11140c'
  on-background: '#e2e4d4'
  surface-variant: '#33362b'
  editor-bg: '#000000'
  token-keyword: '#ff7b72'
  token-function: '#d2a8ff'
  token-string: '#a5d6ff'
  token-comment: '#8b949e'
  log-warn: '#e3b341'
  border-low-contrast: rgba(255, 255, 255, 0.1)
typography:
  code-desktop:
    fontFamily: Monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  code-mobile:
    fontFamily: Monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  ui-label-desktop:
    fontFamily: Sans-serif
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
  status-bar:
    fontFamily: Sans-serif
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1'
  section-header:
    fontFamily: Sans-serif
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  header-height: 36px
  status-bar-height: 24px
  padding-x: 8px
  padding-y: 4px
  gap-compact: 4px
  target-min-desktop: 24px
  target-min-touch: 44px
---

## Brand & Style

**Bit-Perfect Noir** is a technical, developer-centric design system characterized by high-density layouts and a "mechanical" aesthetic. It draws heavily from **Brutalism** and **Minimalism**, prioritizing function and data density over decorative whitespace. 

The personality is focused, precise, and utilitarian. It targets advanced users who require a high information-to-pixel ratio. The emotional response should be one of "total control" and "uninterrupted flow." Visual interest is generated through precise typography and subtle color coding rather than shadows or depth effects.

## Colors

The palette is rooted in a deep, high-contrast dark mode. 
- **Primary:** A high-visibility "Acid Lime" (#bef263) used for active states, primary actions, and critical status indicators.
- **Backgrounds:** Uses a tiered system of near-blacks. The main workspace (editor) is pure black (#000000) to maximize contrast for syntax highlighting, while surrounding UI panels use a slightly warmer dark olive-black (#11140c).
- **Syntax & Status:** A dedicated set of high-chroma colors for code tokens and console logging levels (Error, Warn, Info) to ensure immediate scannability.
- **Borders:** Uses extremely low-contrast, semi-transparent white (10% opacity) to define boundaries without adding visual noise.

## Typography

The division is strict and binary: **Sans-serif** typography is used for all UI structure, and **Monospace** typography is strictly for code and inputs. 

The typography system is optimized for **High Density** legibility. Vertical space is aggressively conserved through tight line heights. 
- **Size Scale**: Base UI text is 14px (0.875rem), while metadata (status bar, timestamps, shortcuts) descends to 12px (0.75rem) at minimum.
- **Visual Hierarchy**: Do not rely purely on size changes for hierarchy. Compensate small text (like 12px) with `SemiBold` weight or muted colors to maintain prominence without shrinking.
- **Line Heights**: Uses tight but consistent line-heights to perfectly center text within fixed-height containers and avoid vertical bleeding.

## Layout & Spacing

The layout follows a **Fluid Panel** model where the workspace is divided by interactive splitters (resizers).

- **Grid:** No traditional column grid is used. Instead, components align to a 4px baseline.
- **Density:** Desktop layouts use a 24px minimum touch target for efficiency. Mobile views must scale these targets to 44px for accessibility.
- **Panels:** All panels are flush with 1px borders. Padding inside containers is minimal (8px horizontal, 4px vertical) to maximize the "content area" of the code editor.

## Elevation & Depth

Bit-Perfect Noir is a **Flat/Tonal** system. 
- **Depth:** No shadows are used. Hierarchy is established purely through background color shifts (Surface Container tiers) and 1px borders.
- **Active States:** Elevation is conveyed by "lighting up" a border or background with the Primary color (#bef263) rather than lifting the element physically.
- **Modals:** Use a heavy backdrop blur (2px) and a solid 60% black overlay to isolate focus from the high-density background.

## Shapes

The shape language is **Precision-Sharp**. 
- **Base Radius:** 2px (rounded-sm) for standard buttons and inputs to soften the brutalist edges just enough for professional use.
- **Large Radius:** 8px for modals and main containers to define them as distinct structural blocks.
- **Interactive Elements:** Checkboxes and switches use geometric primitives (circles within rounded rectangles) with no gradients.

## Components

- **Buttons:** Small (24px height), flat backgrounds, and 1px borders. Primary buttons use high-contrast foreground colors. Split-buttons are common, separated by a 1px divider.
- **Editor:** Pure black background, persistent line numbers on a slightly lighter gutter. Active line highlights are 5% white opacity.
- **Status Bar:** Locked to the bottom, 24px height, uppercase 10px text. Uses a "status dot" indicator for system state (Idle/Running).
- **Inputs:** Content-editable text spans with 1px borders that appear on hover/focus. No "box" around inputs by default to reduce visual clutter.
- **Console Logs:** Monospaced list with fixed-width timestamps. Color coding restricted to the specific "level" keyword or the entire line for errors.
- **Resizers:** 1px wide lines that change color to the Primary color on hover, providing a clear interactive signal.