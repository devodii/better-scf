# Design system

The shared UI kit for injected UI lives in `apps/extension/components/<Name>/`, one folder per component with `<Name>.tsx`, `<Name>.module.scss`, `<Name>.stories.tsx` and `index.ts`. Feature files only compose these components.

Colors, radii and fonts come only from the scraped tokens in `apps/extension/entrypoints/scf.content/styles/tokens.scss`, exposed as `--bscf-*` custom properties on `:host`. Shared SCSS lives in `apps/extension/entrypoints/scf.content/styles/mixins.scss`. Run `pnpm storybook` to browse every state; Storybook loads the tokens on `:root`, and the `UI/ShadowCheck` story renders the kit inside a shadow root the same way `lib/ui/mount.tsx` does.

The site has one dark theme, so the kit has no light variant.

## Mixins

| Mixin | Use | Tokens |
|---|---|---|
| `base` | `box-sizing` and body font on a component root | `--bscf-font-body` |
| `focus-ring($color)` | `:focus-visible` outline | `--bscf-accent-yellow` (default) |
| `truncate` | single-line ellipsis | none |
| `reset-button` | strips native button styling | none |
| `quick-transition($props...)` | 120ms ease-out, off under `prefers-reduced-motion` | none |
| `floating($placement)` | top-layer panel anchored with CSS anchor positioning, flips when it does not fit | `--bscf-surface`, `--bscf-text`, `--bscf-muted-chip`, `--bscf-font-body` |

## Chip

`<Chip variant>`; radius `--bscf-radius-chip`, font `--bscf-font-body`, long text truncates.

| Variant | Background | Text | Used for |
|---|---|---|---|
| `purple` (default) | `--bscf-chip-purple-bg` | `--bscf-chip-purple-fg` | Integration track, round and budget chips |
| `olive` | `--bscf-chip-olive-bg` | `--bscf-chip-olive-fg` | Open track |
| `yellow` | `--bscf-chip-yellow-bg` | `--bscf-chip-yellow-fg` | RFP track, awarded, phase |
| `muted` | `--bscf-muted-chip` | `--bscf-text-muted` | comments, counts, unknown values |

The site's olive and yellow chips scraped to the same values, so `olive` and `yellow` currently render alike.

## Avatar

`<Avatar name src? href? size>`. Shows the image, or the initials of the first and last word of `name` when there is no `src` or the image fails to load. With `href` it renders a link opening in a new tab.

| State | Background | Text |
|---|---|---|
| initials | `--bscf-muted-chip` | `--bscf-text-muted` |
| link focus | | outline `--bscf-accent-yellow` |

Sizes `sm` 1.5rem, `md` 2rem (default), `lg` 3rem.

## AvatarStack

`<AvatarStack people max size label>`. Shows up to `max` (default 4) overlapping avatars, each with a tooltip of name and role, then a `+N` bubble whose tooltip lists the rest. Renders nothing for an empty list.

| Part | Tokens |
|---|---|
| overlap ring | `--bscf-surface` |
| `+N` bubble | background `--bscf-muted-chip`, text `--bscf-text` |

Sizes match Avatar; default `sm`.

## Tooltip

`<Tooltip content placement isOpen?>` wraps one focusable or hoverable element, opens on hover and focus, and links it with `aria-describedby`. `isOpen` pins it open. Built on `popover="hint"` in the top layer, so it is never clipped by the page.

| Placement | Tokens |
|---|---|
| `top` (default), `bottom` | background `--bscf-surface`, text `--bscf-text`, border `--bscf-muted-chip`, radius `--bscf-radius-chip` |

## IconButton

`<IconButton label variant size isPressed?>`; `label` becomes `aria-label`, `isPressed` sets `aria-pressed`. Focus ring `--bscf-accent-yellow`.

| Variant | Rest | Hover | Pressed |
|---|---|---|---|
| `ghost` (default) | text `--bscf-text-muted` | text `--bscf-accent-yellow` | text `--bscf-accent-yellow` |
| `surface` | background `--bscf-muted-chip`, text `--bscf-text` | text `--bscf-accent-yellow` | background `--bscf-chip-yellow-bg`, text `--bscf-accent-yellow` |
| `accent` | background `--bscf-accent-yellow`, text `--bscf-bg`, focus ring `--bscf-text` | opacity 0.85 | |

Sizes `sm` 1.5rem, `md` 2rem (default), `lg` 3rem. Disabled: opacity 0.4.

## Popover

`<Popover label trigger isOpen onOpenChange placement>`; controlled. The trigger (usually an IconButton) toggles it natively through `popovertarget`; Escape and outside clicks close it and report through `onOpenChange`. Renders as `role="dialog"` in the top layer.

| Placement | Tokens |
|---|---|
| `bottom` (default), `top` | background `--bscf-surface`, text `--bscf-text`, border `--bscf-muted-chip`, radius `--bscf-radius-chip` |

## Toggle

`<Toggle label checked onChange disabled?>`, a `role="switch"` button. Also used by the popup, which has its own `--color-*` tokens, so each color falls back to the popup token when the `--bscf-*` one is not defined.

| State | Track | Thumb |
|---|---|---|
| off | `--bscf-muted-chip` (popup `--color-border`) | `--bscf-text-muted` (popup `--color-surface`) |
| on | `--bscf-accent-yellow` (popup `--color-primary`) | `--bscf-bg` (popup `--color-surface`) |
| focus | outline `--bscf-accent-yellow` (popup `--color-primary`) | |
| disabled | opacity 0.5 | |

Label text `--bscf-text` (popup `--color-text`).

## Gaps in the tokens

The scrape found no spacing scale, font sizes or shadow (`shadow-card` was not found on the site), so component spacing and sizes are fixed `rem` values in each module and no component uses a shadow.
