# Window Management System Design

**Date:** 2026-06-27
**Author:** Design Specification
**Status:** Approved

## Overview

A comprehensive window management system that brings desktop OS-like interactions to mini apps, including edge/corner resizing, window snapping, double-click maximize toggle, and Windows 11-style button layout.

## Goals

1. Enable intuitive window manipulation through edge/corner resizing
2. Provide window snapping for efficient screen space utilization
3. Add familiar double-click title bar maximize/restore behavior
4. Modernize button layout to Windows 11 style
5. Maintain existing multi-desktop and z-index management capabilities

## Non-Goals

- Window tabbing or grouping (out of scope)
- Virtual desktops (already supported)
- Window tiling (snapping covers this use case)

## Architecture

### State Structure Extensions

```typescript
type WindowState = "normal" | "minimized" | "maximized";
type SnapState = "corner-tl" | "corner-tr" | "corner-bl" | "corner-br" | "edge-left" | "edge-right" | "edge-top" | "edge-bottom" | null;

export interface Window {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: WindowState;
  zIndex: number;
  snapState: SnapState;  // NEW
  preMaximizeRects: WindowGeometry;  // EXISTING, will be used for restore
}
```

### New Store Actions

```typescript
interface WindowManagerState {
  // ... existing actions

  // NEW: Set window position only (for resize operations)
  setWindowPosition: (desktopId: string, windowId: string, position: { x: number; y: number }) => void;

  // NEW: Set window size only (for resize operations)
  setWindowSize: (desktopId: string, windowId: string, size: { width: number; height: number }) => void;

  // NEW: Snap window to zone
  snapWindow: (desktopId: string, windowId: string, snapState: SnapState) => void;

  // NEW: Toggle maximize (helper for double-click)
  toggleMaximize: (desktopId: string, windowId: string) => void;

  // NEW: Clear snap state
  clearSnapState: (desktopId: string, windowId: string) => void;
}
```

## Feature Specifications

### 1. Edge & Corner Resizing

#### Detection Zones

Resize detection zones (8px from each edge/corner):

```
┌─────────────────────────────────────────────┐
│  ↖ 8px  │              │              ↗ 8px  │
│─────────┼──────────────┼───────────────────│
│         │              │                   │
│         │              │                   │
│  8px    │   CONTENT    │             8px    │
│  ←      │              │                →  │
│         │              │                   │
│         │              │                   │
│─────────┼──────────────┼───────────────────│
│  ↙ 8px  │              │              ↘ 8px  │
└─────────────────────────────────────────────┘
```

#### Resize Cursors

- **Top-left**: `nwse-resize`
- **Top**: `ns-resize`
- **Top-right**: `nesw-resize`
- **Right**: `ew-resize`
- **Bottom-right**: `nwse-resize`
- **Bottom**: `ns-resize`
- **Bottom-left**: `nesw-resize`
- **Left**: `ew-resize`

#### Constraints

- **Minimum size:** 320px width × 240px height
- **Maximum size:** viewport dimensions (enforced by existing maximize)
- **Resize disabled** when window is maximized

#### Interaction Flow

1. User hovers near edge/corner → cursor changes immediately
2. User clicks and drags → window resizes in dragged direction
3. Window geometry updates continuously during drag
4. Minimum size enforced at all times

### 2. Window Snapping

#### Snap Zones

**Corner Snap (1/4 screen size):**
- Top-left, Top-right, Bottom-left, Bottom-right
- Trigger: Window dragged within 20px of corner
- Result: Window occupies 1/4 of available screen area

**Edge Snap (1/2 screen size):**
- Left, Right, Top, Bottom
- Trigger: Window dragged within 20px of edge
- Result: Window occupies 1/2 of available screen area

#### Snap Calculations

```typescript
const MENUBAR_HEIGHT = 36;
const availableWidth = window.innerWidth;
const availableHeight = window.innerHeight - MENUBAR_HEIGHT;

// Corner snap (1/4)
const cornerSnap = {
  "corner-tl": { x: 0, y: MENUBAR_HEIGHT, w: availableWidth / 2, h: availableHeight / 2 },
  "corner-tr": { x: availableWidth / 2, y: MENUBAR_HEIGHT, w: availableWidth / 2, h: availableHeight / 2 },
  "corner-bl": { x: 0, y: MENUBAR_HEIGHT + availableHeight / 2, w: availableWidth / 2, h: availableHeight / 2 },
  "corner-br": { x: availableWidth / 2, y: MENUBAR_HEIGHT + availableHeight / 2, w: availableWidth / 2, h: availableHeight / 2 },
};

// Edge snap (1/2)
const edgeSnap = {
  "edge-left": { x: 0, y: MENUBAR_HEIGHT, w: availableWidth / 2, h: availableHeight },
  "edge-right": { x: availableWidth / 2, y: MENUBAR_HEIGHT, w: availableWidth / 2, h: availableHeight },
  "edge-top": { x: 0, y: MENUBAR_HEIGHT, w: availableWidth, h: availableHeight / 2 },
  "edge-bottom": { x: 0, y: MENUBAR_HEIGHT + availableHeight / 2, w: availableWidth, h: availableHeight / 2 },
};
```

#### Ghost Preview

- Semi-transparent overlay (30% opacity) when window enters snap zone
- Shows exact final position and size
- Follows window during drag
- Appears/disappears smoothly with CSS transitions
- Visual feedback: subtle blue accent (#3B82F6) on preview border

#### Interaction Flow

1. User drags window
2. When window enters snap zone (20px threshold), ghost preview appears
3. On mouse release within snap zone → window snaps to calculated position/size
4. Snap state stored for potential restoration
5. Dragging snapped window away → clears snap state, returns to normal drag

### 3. Double-Click Title Bar Toggle

#### Behavior

- Double-click on title bar toggles maximize/restore
- Works from any state: normal, snapped, or maximized
- Always maximizes from snapped state

#### State Flow

```
Normal ←→ Maximized
Snapped (any) → Maximized → Normal
```

#### Implementation

- `onDoubleClick` handler attached to title bar div
- Calls `toggleMaximize` store action
- Preserves pre-maximize geometry for restoration
- Uses existing `preMaximizeRects` mechanism

### 4. Windows 11-Style Buttons

#### Layout

```
┌────────────────────────────────────────────────────┐
│ [X]                    TITLE                   [□]  │
└────────────────────────────────────────────────────┘
   ↑                                                 ↑
   Left side                                        Right side
   Close (only)                                      Maximize/Restore
```

#### Close Button (Left Side)

- **Icon:** `X` from lucide-react
- **Default:** Transparent background, dark gray X (#1A1A1A)
- **Hover:** Red background (#C42B1C), white X, rounded corners (4px)
- **Size:** 44px × 32px
- **Position:** Left side of title bar, 8px padding

#### Maximize/Restore Button (Right Side)

- **Icons:**
  - Maximize: `Square` from lucide-react
  - Restore: Two overlapping rectangles or custom icon
- **Default:** Transparent background, dark gray icon (#1A1A1A)
- **Hover:** Light gray background (#E5E5E5), rounded corners (4px)
- **Size:** 44px × 32px
- **Position:** Right side of title bar, 8px padding

#### Removed Components

- Minimize button (yellow circle with minus)
- Spacer div on the right

## Component Structure

```
Window.tsx
├── TitleBar
│   ├── CloseButton (left, Windows 11 style)
│   ├── Title (center)
│   ├── MaximizeButton (right, Windows 11 style)
│   └── onDoubleClick handler
├── ResizeOverlay
│   ├── ResizeZone (8 zones: top, bottom, left, right, 4 corners)
│   └── Cursor management
├── SnapGhostPreview (conditional render)
│   └── Ghost rectangle (30% opacity)
└── ContentArea (unchanged)
```

## Visual Design

### Animation Timing

- **Resize:** 200ms spring (stiffness: 300, damping: 30)
- **Snap:** 300ms spring (stiffness: 250, damping: 25)
- **Maximize/Restore:** 250ms spring (stiffness: 400, damping: 30)
- **Ghost preview:** 150ms ease-out (fade in/out)

### Active Window Feedback

- Subtle 2px blue border (#3B82F6) on focused window
- Only when not maximized (to avoid visual clutter)

### Window Shadow

- Enhanced during drag: `shadow-[0_16px_48px_rgba(0,0,0,0.25)]`
- Default: `shadow-[0_8px_32px_rgba(0,0,0,0.15)]`

## Implementation Considerations

### Resize Detection

Use absolute positioned overlay divs at edges/corners rather than mouse position calculations. This provides:
- Better performance (CSS handles hover states)
- Cleaner separation of concerns
- Easier to maintain hit zones

### Snap Detection During Drag

Track mouse position during drag operations to determine snap zone proximity. Show ghost preview when within 20px threshold.

### State Synchronization

Ensure resize and snap operations don't conflict:
- Resize disabled during snap preview
- Snap cleared on any manual resize
- Maximize clears snap state

### Z-Index During Resize

No z-index changes needed during resize—window already has focus from drag start.

## Error Handling

### Minimum Size Enforcement

If user tries to resize below 320×240:
- Clamp to minimum dimensions
- Visual feedback: brief red flash on border
- No error message needed (self-correcting)

### Edge Cases

- Window larger than viewport: clamp to viewport minus menubar
- Negative position: clamp to 0 for x/y
- NaN from calculation: use fallback values

## Testing Strategy

### Unit Tests

- Resize zone detection (8 directions)
- Snap calculation accuracy
- Minimum size enforcement
- State transitions (normal ↔ snapped ↔ maximized)

### Integration Tests

- Drag window to corner → snaps correctly
- Drag window to edge → snaps correctly
- Drag snapped window away → normal state
- Double-click title bar → maximize/restore

### Visual Tests

- Cursor changes on hover near edges
- Ghost preview appears in correct position
- Button hover states match Windows 11 style
- Active window border visible

## Performance Considerations

### Resize Detection

- CSS-based hover detection (no JavaScript overhead)
- Event listeners only on resize zones (small areas)
- Cursor changes via CSS `cursor` property

### Snap Preview

- Single ghost element (no DOM thrashing)
- Position calculations during drag only
- Debounced if needed (unlikely)

### State Updates

- Immer middleware ensures efficient updates
- Only changed properties trigger re-renders
- Z-index compaction prevents overflow

## Future Enhancements (Out of Scope)

- Window stacking order persistence
- Snap undo (drag away returns to pre-snap position)
- Keyboard shortcuts for snapping (Win+Arrow keys)
- Multi-select snap (snap multiple windows simultaneously)
- Custom snap zones (user-defined layouts)

## Migration Path

1. Add new state properties to Window interface
2. Add new store actions (setWindowPosition, setWindowSize, snapWindow, etc.)
3. Create ResizeOverlay component
4. Create SnapGhostPreview component
5. Update Window.tsx button layout
6. Add double-click handler
7. Add snap detection logic
8. Update tests
9. Visual polish and testing

No breaking changes to existing functionality.
