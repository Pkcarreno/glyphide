---
name: typography-convention
description: Enforce strict typography and text consistency rules for UI design. Use when styling text, creating UI components, or adjusting typography hierarchy.
---

# UI Typography & Text Consistency Rules

When styling text or building UI components, you MUST adhere to the following typography system to ensure high-density legibility and consistency:

## 1. Font Families (Sans vs Mono)
The division is strict and binary:
- **UI (Sans-serif)**: Used for all structural UI elements. This includes the status bar, command palette, workspace tabs, dropdown menus, notifications, and tooltips.
- **Code (Monospace)**: Strictly confined to injected or manipulated content. Use this for code buffers, integrated terminal, and search/command inputs where character alignment is critical.

## 2. Size Scale
- **Base UI**: `14px` (`0.875rem`). Use this for general UI text.
- **Metadata**: `12px` (`0.75rem`). Use this for file paths, keyboard shortcuts, or status bar metadata. Do not go below `12px`.

## 3. Visual Hierarchy
Do not rely exclusively on size reduction to denote lesser importance.
- To create hierarchy in small text (e.g., `12px`), use the `SemiBold` variant or apply semantic muted colors (attenuation tokens).
- Avoid shrinking text further just to make it look "less important".

## 4. Line Heights
- Use tight, consistent line-heights to avoid vertical bleeding of ascenders and descenders.
- Ensure text is perfectly vertically centered within its containers (e.g., a 28px tall status bar).
