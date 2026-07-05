# Full Software UI Redesign — Champagne Gold & Glassmorphic Theme

## Goal
Apply the Enterprise "Champagne Gold & Frosted Glassmorphic" design shown in the mockup to the **entire** application — every screen, every sidebar, every page background, every form and modal.

## Reference Design
![Enterprise Dashboard](C:/Users/HomePC/.gemini/antigravity-ide/brain/48df0862-33a4-4cf5-8550-883d685a1e7c/enterprise_gold_dashboard_v1_1782118801454.png)

---

## Proposed Changes

### 1. Global CSS Foundation — `styles.css`
- Replace the blue/slate root gradient with the **warm champagne-gold mesh background**: ivory center, gold radial flares on corners, deep slate-indigo vignette edges
- Add CSS custom properties: `--gold`, `--gold-light`, `--gold-dark`, `--glass-bg`, `--glass-border`, `--gold-text`
- Update `.sidebar` to use **frosted gold glass**: `backdrop-blur(24px)`, semi-transparent warm white, `1px solid rgba(212,175,55,0.28)` border, subtle right shadow
- Update `.topbar` to use the wide frosted glass search + action bar style
- Update form input focus rings from blue → **gold**: `rgba(212,175,55,0.55)`
- Update `.primary` buttons to **metallic gold gradient**
- Update `.status-pill` colors to gold palette
- Add Google Fonts: **Inter** (body) + **Playfair Display** (headings optional)

### 2. `AppLayout.tsx`
- Change outer background from `bg-[#f4f8ff]` → transparent (let global CSS gradient show through)
- Update `<main>` wrapper from blue-glass → **warm white/gold-glass**: `background: rgba(255,252,245,0.55)`, `border: 1px solid rgba(212,175,55,0.22)`, `backdrop-blur(20px)`

### 3. `Sidebar.tsx` — Complete Gold Redesign
- Background: `background: rgba(255,252,248,0.72)` + `backdrop-blur(24px)` + right gold border
- Logo section: Gold circular emblem + "Sky Ariana & Balam Bar Baran" in dark champagne serif
- **Active nav item**: solid brushed gold capsule (`linear-gradient(135deg, #d4a017, #c8900a)`) with white text and gold glow shadow
- **Inactive nav items**: `color: #7c5e00` hover effect with warm champagne tint
- Company selector: gold-bordered frosted select
- User profile widget: ornate gold-rimmed frosted card with avatar initial, name, role, username in warm dark text
- Logout button: soft warm-rose in gold palette
- Status pill: gold/amber tones

### 4. `TopBar.tsx` — Premium Header Bar
- Wide frosted glass panel with gold bottom border hairline
- Left: Search input `"Search for transactions, invoices, or clients..."` with magnifier icon
- Right: "Actions ▾" frosted glass dropdown + "Review" metallic gold button + bell/profile icons
- Company badge: gold-pill instead of blue

### 5. `LoginPage.tsx` — Gold Login Screen
- Background: same champagne mesh gradient
- Login card: premium frosted glass panel with gold border and gold glow shadow
- Logo/title in gold serif
- Input fields: gold-bordered frosted
- Login button: full metallic gold gradient

### 6. All Interior Pages — Consistent Token Application
All page components already use Tailwind inline styles. The global CSS variable changes in step 1 and the AppLayout/Sidebar/TopBar changes will propagate the gold theme automatically. No per-page color rewrite needed.

---

## Execution Order
1. `styles.css` — global tokens and base components
2. `AppLayout.tsx` — shell background and main panel
3. `Sidebar.tsx` — full gold sidebar
4. `TopBar.tsx` — gold header
5. `LoginPage.tsx` — gold login
6. `npm run build` — verify zero errors

## Verification
- Start dev server, visually check all 9 sidebar pages
- Confirm sidebar active state, hover states, user profile widget
- Confirm TopBar search + action buttons
- Confirm login page gold theme
- Run production build — zero errors required
