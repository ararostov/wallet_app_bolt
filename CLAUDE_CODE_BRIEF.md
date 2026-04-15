# Retail Wallet Mobile — Claude Code Handoff Brief

## Who I am
Ara Khachikyan — Product Manager, co-founder of Retail Wallet.
Contact: ararostov@gmail.com, Telegram: @aralondon

## What this project is
White-label digital wallet mobile app (iOS + Android) for retail/QSR merchants.
This specific build is a **Tesco-branded prototype** to demo to pilot merchants.

## GitHub repo
https://github.com/ararostov/wallet_app_bolt

## Tech Stack
- Expo + React Native + TypeScript
- react-native-reusables (shadcn port for React Native)
- NativeWind (Tailwind for RN)
- Expo Router (file-based navigation)
- lucide-react-native (icons)
- AsyncStorage (local persistence)
- NO backend yet — all mock data

## Current Status
App was generated in Bolt.new from a detailed spec. Basic UI is working and testable via Expo Go on iPhone. Now moving to Claude Code for precise fixes and logic.

---

## BUGS TO FIX (Priority order)

### Bug #1 — Mock Transaction Data — CRITICAL
All transactions must be Tesco only. Replace entire mock data with:

```
1. purchase | Tesco Extra       | -£78.50  | Today 14:20     | cashback: £3.14
2. cashback | Cashback · Tesco Extra | +£3.14  | Today 14:20     | GREEN
3. purchase | Tesco Express     | -£34.99  | Today 10:15     | cashback: £1.40
4. cashback | Cashback · Tesco Express | +£1.40  | Today 10:15     | GREEN
5. topup    | Top-up            | +£50.00  | Yesterday 13:00 | GREEN
6. purchase | Tesco Metro       | -£12.30  | Yesterday 11:45 | cashback: £0.49
7. cashback | Cashback · Tesco Metro | +£0.49  | Yesterday 11:45 | GREEN
8. topup    | Top-up            | +£100.00 | 12 Apr 09:00    | GREEN
9. purchase | Tesco Extra       | -£55.20  | 11 Apr 16:30    | cashback: £2.21
10. cashback | Cashback · Tesco Extra | +£2.21  | 11 Apr 16:30   | GREEN
```

Color rules:
- purchases: BLACK text, no + sign
- cashback: GREEN text, with + sign
- topups: GREEN text, with + sign

### Bug #2 — Dark Mode — not working
Toggle exists in Profile → Preferences but does nothing. Need global ThemeContext wrapping entire app.
Dark palette: background `#0F172A`, surfaces `#1E293B`, text white, subtitles `#94A3B8`

### Bug #3 — Transaction Filter Chips — broken
All / Top-ups / Purchases / Cashback / Refunds chips don't filter correctly.

### Bug #4 — Home Screen Card Widget
Current: shows card number + cardholder name + balance outside card.
Target layout:
```
[Small row: Tesco logo | "Tesco Wallet" | "Active" | →]
[Balance card: £124.50 / "Top-ups £100.00 · Cashback £21.97 (expires in 5 days)"]
[+ Add Funds button]
[2x3 grid: Invite Friends, Auto Reload, Rewards, Silver tier, Perks & Offers]
[Recent transactions]
```

### Bug #5 — Card Screen ("My Card")
- Remove: card number, cardholder name, expiry, chip icon
- Card shows only: "TESCO WALLET" text on gradient background
- Remove action buttons: Freeze, Show details, Methods
- Keep: Limits row, Apple Wallet button, Google Wallet button, Delete card
- Apple Wallet button: black bg, official Apple logo (per Apple guidelines)
- Google Wallet button: white bg with border, official Google logo
- Add back button ← in header

### Bug #6 — Profile Screen
- All menu icons must be monochrome black — remove colored backgrounds
- Avatar centered (not left-aligned)
- Add back button ← in header
- Remove: Language row
- Contact us → opens screen with phone/email/hours
- Store Locator → map + list of 8 London Tesco stores (see details below)

### Bug #7 — Splash / Onboarding
- "I already have an account" link on ALL intro slides, not just last
- Fix Next button overlap with content (add bottom padding)
- DOB input: native drum picker OR masked input DD/MM/YYYY

### Bug #8 — Social Auth Buttons
- Apple: black bg, official white Apple logo, per Apple HIG
- Google: white bg + border, official multicolor Google G logo

### Bug #9 — Transaction Detail Screen
- Remove "Type" row
- Replace "Report an issue" with "Request Refund" button

### Bug #10 — Rewards Screen
- Top prominent figures: "£24.86 Earned all time" + "£0.89 Pending"
- Reward line items: "Base cashback · Tesco Express", "Welcome bonus" etc.
- Remove: cashback/bonus/promo breakdown stats row

### Bug #11 — All Tiers Screen
- Each tier card shows ONLY: cashback % + spend threshold
- Remove: Boosted merchants, Support, Anniversary bonus rows

### Bug #12 — Referral Screen — Friend avatars
- Light gray bg (`#E2E8F0`) + dark gray initial letter (`#64748B`)
- Remove large solid blue circles

### Bug #13 — Consistent padding
- All elements on Home screen: 16px horizontal padding everywhere

### Bug #14 — Delete Card — Password protection
- Require PIN "1234" before deletion
- Show error if wrong

### Bug #15 — Home screen
- Remove bottom promo banner "Invite friends, earn £5"
- "Hi, Alex" → use actual user first name from context

---

## Store Locator Data (8 London Tesco stores)

1. **Tesco Express Covent Garden** — 26-28 The Piazza WC2E 8RF — 020 7240 8765 — Mon-Sat 7am-11pm Sun 8am-10pm
2. **Tesco Express Canary Wharf** — 18 Canada Square E14 5AB — 020 7719 0380 — Mon-Fri 6am-11pm Sat-Sun 8am-10pm
3. **Tesco Express Shoreditch** — 2 Kingsland Road E2 8DA — 020 7739 4210 — Mon-Sat 7am-11pm Sun 9am-10pm
4. **Tesco Extra Kensington** — 344 Kensington High St W14 8NS — 020 7603 4180 — Mon-Sat 6am-midnight Sun 11am-5pm
5. **Tesco Metro London Bridge** — 48 London Bridge St SE1 9SG — 020 7407 3220 — Mon-Fri 6:30am-10pm Sat 7am-10pm Sun 9am-9pm
6. **Tesco Express Soho** — 62 Old Compton St W1D 4UH — 020 7287 0563 — Mon-Sun 7am-11pm
7. **Tesco Express Brixton** — 11 Atlantic Road SW9 8HX — 020 7274 3890 — Mon-Sat 7am-11pm Sun 8am-10pm
8. **Tesco Metro Victoria** — 58-60 Victoria St SW1E 6QP — 020 7630 1180 — Mon-Fri 7am-10pm Sat 8am-10pm Sun 10am-8pm

---

## Roadmap (for context)
- **Phase 1:** UI fixes (NOW — Claude Code)
- **Phase 2:** Supabase (auth + database)
- **Phase 3:** Stripe (PSP) + Twilio (SMS) + Resend (email) + Expo Push
- **Phase 4:** Thredd API + Moorwand (card issuing) + TrueLayer (Open Banking)
- **Phase 5:** EAS Build → TestFlight + Google Play Beta
- **Phase 6:** White-label per merchant → pilot rollout

---

## How to start
```bash
git clone https://github.com/ararostov/wallet_app_bolt
cd wallet_app_bolt
npm install
npx expo start
```

Start with Bug #1 (mock data) and Bug #2 (dark mode) — these are most visible.
