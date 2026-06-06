# Minimal Time Slider Design

## Summary

Replace the existing `Timeline` component with an ultra-minimal time slider that autoscales with sidebar width.

## Visual

- Single 1px accent-colored horizontal line spanning the available width
- Small diamond handle (6px rotated square) on the line, accent-colored border
- Faint time readout (mono 10px) visible only during hover or drag
- No header, no tick marks, no day/night gradient

## Layout

- Fixed position at bottom of globe area
- `left: 0; right: var(--sidebar-w); bottom: 0`
- Container height ~20px with 16px horizontal padding
- Width autoscales as sidebar is resized (CSS var `--sidebar-w` updates live)

## Behavior

- Drag to scrub through 24 hours in 5-minute increments
- Sets `live = false` on interaction (same as current)
- Time readout shows anchor timezone time on hover/drag
- Touch support (touchstart/touchmove/touchend)

## Responsive

- Below 860px: spans full width above bottom sidebar panel
- Below 560px: same, reduced padding

## Changes

### `src/App.jsx`
- Replace `Timeline` component with new `TimeSlider` component
- Same props interface: `anchor`, `hour12`, `instant`, `onScrub`
- Remove Timeline-specific markup (tl-head, tl-tick, tl-daynight)

### `src/styles.css`
- Remove `.timeline`, `.tl-*` styles
- Add `.time-slider` and child styles (`.ts-track`, `.ts-fill`, `.ts-handle`, `.ts-readout`)
