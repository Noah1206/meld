# Meld Landing Page Design System

## Colors

### Text
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1A1A1A` | Headings, buttons, logo |
| Secondary | `#999` | Body text, descriptions |
| Tertiary | `#CCC` | Subtitle text (hero line 2), muted |
| Placeholder | `#B4B4B0` | Input placeholder |
| Nav inactive | `#787774` | Nav links default |
| Label | `#9A9A95` | Small labels |

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| Page | `#FFFFFF` | Main background |
| Surface | `#FAFAFA` | Cards, sections, hover |
| Input bg | `#F0F0EE` | Category dropdown button |
| Dark section | `#0B0E11` | Features section |
| Dark card | `#131619` | Feature card bg |
| Footer/CTA | `#1A1A1A` | Bottom CTA, code blocks |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| Subtle | `black/[0.04]` | Card rings |
| Default | `black/[0.08]` | Input border, card border |
| Hover | `black/[0.15]` | Input focus, card hover |
| Dark | `#1E2228` | Dark section card borders |
| Nav scroll | `black/[0.06]` | Nav bottom border on scroll |

### Accents
| Token | Value | Usage |
|-------|-------|-------|
| Mint | `#10B981` | Success, primary accent |
| Yellow | `#FBBF24` | Warning, feature label |
| Purple | `#A78BFA` | Feature label |
| Blue | `#3B82F6` | Info, framework active |
| Red | `#F87171` | Diff removed |
| Green | `#34D399` | Diff added |

---

## Typography

### Font Family
- Sans: `Geist Sans` (var(--font-geist-sans))
- Mono: `Geist Mono` (var(--font-geist-mono))

### Scale
| Element | Size | Weight | Tracking | Line Height |
|---------|------|--------|----------|-------------|
| Hero h1 | 36/48/60/68px | Bold (700) | -0.04em | 1.05 |
| Section h2 | 32/40/48px | Bold (700) | -0.03em | tight (1.25) |
| Feature h3 | 24/28px | Bold (700) | -0.02em | 1.15 |
| Body | 15-17px | Regular (400) | normal | 1.7 (hero), relaxed |
| Nav link | 14px | Regular/Medium | normal | normal |
| Button | 14-15px | Semibold (600) | normal | normal |
| Small | 13px | Medium (500) | normal | normal |
| Label | 11-12px | Semibold (600) | 0.12em | normal |
| Micro | 10px | Medium (500) | normal | normal |
| Code | 11-12px | Regular (mono) | normal | 1.8 |

---

## Spacing

### Section Padding
| Section | Top | Bottom |
|---------|-----|--------|
| Hero | pt-36 (144px) / lg:pt-48 (192px) | pb-6 / lg:pb-12 |
| Standard | py-24 (96px) | lg:py-32 (128px) |
| Compact | py-14 (56px) | lg:py-20 (80px) |

### Container
- Hero: `max-w-3xl` (48rem) + `px-6`
- Input: `max-w-2xl` (42rem)
- Sections: `max-w-[1440px]` + `px-6 lg:px-16`

### Component Spacing
| Element | Value |
|---------|-------|
| Title → description | mt-6 (24px) |
| Description → input | mt-10 (40px) |
| Card padding | p-6 (24px) |
| Input padding | px-5 pt-5 pb-3 |
| Button padding (nav) | px-4 py-1.5 |
| Button padding (large) | px-7 py-3.5, px-10 py-5 |
| Grid gap | gap-4, gap-8, gap-12 |
| Flex gap | gap-2, gap-2.5, gap-3, gap-10 |

---

## Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| sm | rounded-md (6px) | Small elements |
| base | rounded-lg (8px) | Buttons, nav links, icons |
| lg | rounded-xl (12px) | Cards, dropdowns, inputs |
| xl | rounded-2xl (16px) | Hero input, large cards |
| 3xl | rounded-3xl (24px) | Download card |
| full | rounded-full (9999px) | Pills, badges, avatars |

---

## Shadows
| Token | Value | Usage |
|-------|-------|-------|
| sm | `shadow-sm` | Nav on scroll, tab active |
| lg | `shadow-lg` | Card hover |
| xl | `shadow-xl` | Dropdown menu |
| Input focus | `shadow-lg` | Input focus-within |
| Ring subtle | `ring-1 ring-black/[0.04]` | Default card |
| Ring default | `ring-1 ring-black/[0.06]` | Icons |
| Ring emphasis | `ring-1 ring-black/[0.08]` | Card hover |

---

## Animations

### Entrance
| Name | Transform | Duration | Easing |
|------|-----------|----------|--------|
| fadeInUp | translateY(20px) → 0 | 0.5s | cubic-bezier(0.16, 1, 0.3, 1) |
| fadeIn | opacity 0 → 1 | 0.3s | ease-out |
| revealUp | translateY(40px) → 0 | 0.7s | cubic-bezier(0.16, 1, 0.3, 1) |
| revealScale | scale(0.9) → 1 | 0.6s | cubic-bezier(0.16, 1, 0.3, 1) |
| scaleIn | scale(0.95) → 1 | 0.3s | ease-out |

### Looping
| Name | Effect | Duration |
|------|--------|----------|
| blink | opacity 0↔1 | 0.8s step-end |
| float | translateY(-8px) | 3s ease-in-out |
| marquee | translateX(0 → -50%) | 30s linear |
| shimmer | bg-position shift | 1.5s |
| pulse-glow | opacity 0.4↔0.8 | 2s ease-in-out |

### Stagger Delays
- 75ms increments: 75, 150, 225, 300, 450, 600, 750, 900, 1050, 1200ms

### Hover/Active
- Scale down: `active:scale-[0.95]` to `active:scale-[0.99]`
- Scale up: `hover:scale-105`, `hover:scale-[1.03]`
- Translate: `hover:translate-x-0.5`, `hover:-translate-y-0.5`, `hover:-translate-y-1`
- Duration: 300-500ms transitions

---

## Layout Patterns

### Navigation
```
fixed top-0 z-50, h-14
flex items-center justify-between, max-w-7xl, px-6
Left: Logo + Nav links
Right: Login + CTA button
Scroll: bg-white/80 backdrop-blur-xl border-b shadow-sm
```

### Hero
```
text-center, max-w-3xl mx-auto
h1 (typewriter) → p (fade-in) → input (fade-in)
Staggered: 0ms → 150ms → 300ms
```

### Section
```
py-24 lg:py-32
max-w-[1440px] mx-auto px-6 lg:px-16
Label (mono, uppercase, tracked) → h2 → description → content grid
```

### Feature (2-col)
```
grid items-center gap-12 lg:grid-cols-2
Left: text (label + h3 + p)
Right: visual card (rounded-2xl border bg-dark)
Alternating: swap order with lg:order-1/2
```

### Cards Grid
```
grid gap-4 sm:grid-cols-3
Cards: rounded-xl bg-surface p-6 ring-1 ring-subtle
Hover: ring-emphasis shadow-lg -translate-y-1
```

---

## Component Reference

### Button (Primary)
```
rounded-lg bg-[#1A1A1A] px-4 py-1.5
text-[14px] font-semibold text-white
hover:bg-[#333] active:scale-[0.97]
```

### Button (Secondary)
```
rounded-lg px-4 py-1.5
text-[14px] text-[#787774]
hover:text-[#1A1A1A] hover:bg-black/[0.03]
```

### Input Box
```
rounded-2xl border border-black/[0.08] bg-white
focus-within:border-black/[0.15] focus-within:shadow-lg
Textarea: px-5 pt-5 pb-3 text-[15px] min-h-[100px]
Bottom bar: flex items-center justify-between px-4 py-3
```

### Card
```
rounded-xl bg-[#FAFAFA] p-6
ring-1 ring-black/[0.04]
hover:ring-black/[0.08] hover:shadow-lg hover:-translate-y-1
transition-all duration-300
```

### Badge
```
rounded-full px-2 py-0.5
text-[10px] font-medium
bg-white ring-1 ring-black/[0.04]
```

### Code Block
```
rounded-xl bg-[#1A1A1A] ring-1 ring-black/[0.1]
Header: px-4 py-2.5, font-mono text-[11px] text-[#555]
Body: font-mono text-[12px] leading-[1.8]
Line numbers: w-6 text-right text-[#444]
```

---

## Background Effects

### Grid Overlay
```css
background-image:
  linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
  linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px);
background-size: 80px 80px;
position: fixed; pointer-events: none;
```

### Glassmorphism (Nav)
```
bg-white/80 backdrop-blur-xl
border-b border-black/[0.06]
shadow-sm
```

### Selection
```
selection:bg-[#1A1A1A] selection:text-white
```

---

## Responsive Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <640px | Single column, px-6, smaller text |
| sm | 640px | Grid cols, flex visible |
| md | 768px | Additional layout |
| lg | 1024px | 2-col features, px-16, larger text |
| xl | 1280px | Max text sizes (68px hero) |
