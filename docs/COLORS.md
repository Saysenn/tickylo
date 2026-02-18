# Color Configuration Guide

All colors in this project flow from a single source of truth: **`app/globals.css`**.

---

## Where to Make Changes

### 1. Shadcn/ui Design Tokens — `app/globals.css` → `:root` inside `@layer base`

These are the HSL variables consumed by all shadcn/ui components (`Button`, `Card`, `Badge`, `Input`, etc.).

```css
@layer base {
  :root {
    --background:          0  0% 100%;   /* page background */
    --foreground:        142 41%  9%;   /* default text */

    --primary:           138 79% 71%;   /* main brand color (#80ED99 mint) */
    --primary-foreground: 142 41%  9%;  /* text on primary buttons */

    --secondary:         138 40% 94%;
    --muted:             138 30% 95%;
    --muted-foreground:  138 20% 48%;

    --accent:            138 50% 90%;
    --destructive:         0 84% 60%;   /* red for errors/destructive actions */

    --border:            138 18% 91%;
    --input:             138 18% 91%;
    --ring:              138 79% 71%;   /* focus ring color */

    --radius:            0.75rem;       /* border radius scale */
  }
}
```

> **Format:** `H S% L%` (no `hsl()` wrapper — Tailwind adds it via `hsl(var(--name))`)

---

### 2. Custom Brand Tokens — `app/globals.css` → `:root` (outside `@layer base`)

Raw hex/rgba tokens used for custom utilities like `.glass`, mint buttons, and ink text.

```css
:root {
  /* Mint palette */
  --mint:          #80ED99;   /* primary brand green */
  --mint-hover:    #68E586;   /* hover state */
  --mint-light:    #C4F5D2;
  --mint-lighter:  #E8F9EE;
  --mint-subtle:   #F2FDF6;

  /* Ink (dark text) palette */
  --ink:           #0D1F14;   /* primary text */
  --ink-2:         #3A5E4A;   /* secondary text */
  --ink-3:         #7A9E88;   /* muted/placeholder text */

  /* Glassmorphism */
  --surface:       rgba(255, 255, 255, 0.84);
  --surface-2:     rgba(255, 255, 255, 0.60);
  --glass-border:  rgba(128, 237, 153, 0.18);
}
```

---

### 3. Tailwind Color Utilities — `app/globals.css` → `@theme inline`

This block exposes the CSS variables as Tailwind utility classes (e.g., `bg-mint`, `text-ink-2`, `bg-primary`).

```css
@theme inline {
  --color-mint:       var(--mint);
  --color-mint-hover: var(--mint-hover);
  --color-ink:        var(--ink);
  --color-ink-2:      var(--ink-2);
  --color-ink-3:      var(--ink-3);
  /* ...and all shadcn tokens */
}
```

If you add a new color token to `:root`, you **must also add it here** to use it as a Tailwind class.

---

### 4. Shadcn/ui Config — `components.json`

```json
{
  "tailwind": {
    "css": "app/globals.css",   ← points to the file above
    "baseColor": "zinc",
    "cssVariables": true
  }
}
```

`baseColor` is only used when running `npx shadcn add <component>` to scaffold new components. It does not affect runtime colors.

---

## Quick Reference: How to Change the Brand Color

To replace mint green (`#80ED99`) with a different brand color:

1. **Update `--mint` and `--mint-hover`** in `:root`
2. **Update `--primary`** in `@layer base :root` (HSL values)
3. **Update `--ring`** to match your new primary
4. **Update `--glass-border`** rgba to use your new color's RGB values

---

## Color Usage in Components

| Token | Tailwind Class | Used For |
|-------|---------------|----------|
| `--mint` | `bg-mint`, `text-mint`, `border-mint` | Buttons, icons, accents |
| `--ink` | `text-ink` | Primary headings/text |
| `--ink-2` | `text-ink-2` | Secondary text |
| `--ink-3` | `text-ink-3` | Muted/placeholder text |
| `--primary` | `bg-primary`, `text-primary` | shadcn/ui components |
| `--destructive` | `bg-destructive` | Error states, destructive buttons |
| `--muted-foreground` | `text-muted-foreground` | shadcn/ui muted text |
