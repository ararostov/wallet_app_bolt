// ESLint flat config for the wallet mobile app.
//
// Why this exists: certain domain invariants are otherwise enforced only by
// reviewer discipline. The custom `no-restricted-syntax` and
// `no-restricted-imports` blocks below codify them so regressions show up at
// `npx eslint .` time. See `docs/mobile/technical-debt.ru.md` §6.3 and
// `docs/mobile/conventions.ru.md` §10/§11/§18.
//
// Each rule entry has a comment with the rule it implements (B.1..B.7 from
// the tech-debt brief). Per-folder `overrides` re-disable a rule for the few
// files that legitimately need the banned API (token storage, refresh queue,
// etc.). Keep all such carve-outs here, in one file.

const expoConfig = require('eslint-config-expo/flat');

// --- Restricted-syntax patterns (B.1, B.2, B.3, B.5, B.6, B.7) -----------
// Kept as a const so the per-folder overrides can spread it minus a single
// rule when needed.
const RESTRICTED_SYNTAX = [
  // B.1 — raw fetch() outside utils/api.ts and utils/authQueue.ts
  {
    selector: "CallExpression[callee.type='Identifier'][callee.name='fetch']",
    message:
      "Don't use fetch() directly. Use the api client from @/utils/api (utils/api.ts and utils/authQueue.ts may opt out).",
  },
  // B.2 — parallel axios instance outside utils/api.ts
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.name='axios'][callee.property.name='create']",
    message:
      "Don't create a parallel axios instance. Use the singleton api from @/utils/api.",
  },
  // B.3 — tokens written to AsyncStorage by string key
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.name='AsyncStorage'][callee.property.name='setItem'][arguments.0.type='Literal'][arguments.0.value=/access_?token|refresh_?token|jwt|bearer/i]",
    message:
      "Don't store tokens in AsyncStorage. Use SecureStore via TokenStorage (@/utils/tokens).",
  },
  // B.5 — PAN/CVV-shaped JSX attributes on TextInput
  {
    selector:
      "JSXOpeningElement[name.name='TextInput'] JSXAttribute[name.name=/^(name|placeholder|accessibilityLabel|autoComplete|textContentType)$/][value.value=/pan|card[\\s-]?number|cvv|cvc|security[\\s-]?code/i]",
    message:
      "PCI: never collect PAN/CVV in a plain TextInput. Use a PSP-hosted page (TrueLayer, Adyen, etc).",
  },
  // B.6 — hardcoded Idempotency-Key value
  {
    selector:
      "Property[key.value='Idempotency-Key'][value.type='Literal']",
    message:
      "Don't hardcode Idempotency-Key. Mint via newIdempotencyKey() from @/utils/idempotency, store in a useRef, and rotate on success.",
  },
  // B.7 — console.* called with a sensitive identifier
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.name='console'][callee.property.name=/^(log|info|warn|error|debug)$/] > Identifier.arguments[name=/^(token|accessToken|refreshToken|password|otp|pan|cvv|pin)$/]",
    message:
      "Don't log sensitive values. Use logger from @/utils/logger which scrubs sensitive fields.",
  },
];

// --- Restricted-imports (B.4) ---------------------------------------------
const RESTRICTED_IMPORTS = {
  patterns: [
    {
      group: ['expo-secure-store'],
      message:
        "Don't import expo-secure-store directly. Use TokenStorage (@/utils/tokens), SignupDraftStorage (@/utils/signupDraftStorage), or the device-id helper (@/utils/device).",
    },
  ],
};

module.exports = [
  // Base Expo config (TypeScript + React + import + react-hooks).
  ...expoConfig,

  // Ignored paths.
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '.expo/**',
      '.expo-shared/**',
      '*.config.js',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'tailwind.config.js',
      'jest.setup.ts',
      'eslint.config.js',
    ],
  },

  // Project-wide domain invariants.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...RESTRICTED_SYNTAX],
      'no-restricted-imports': ['error', RESTRICTED_IMPORTS],
      // React Native renders JSX text via <Text> nodes — not HTML — so the
      // entity-escaping rule from eslint-plugin-react has no value here and
      // produces only noise. Disable it project-wide.
      'react/no-unescaped-entities': 'off',
    },
  },

  // utils/api.ts owns the axios singleton — opt out of B.1 (fetch) and B.2
  // (axios.create). Token-related rules still apply.
  {
    files: ['utils/api.ts', 'utils/api/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...RESTRICTED_SYNTAX.filter(
          (r) =>
            !r.selector.includes("callee.name='fetch'") &&
            !r.selector.includes("callee.property.name='create'"),
        ),
      ],
    },
  },

  // utils/authQueue.ts uses raw fetch() for token refresh to break the
  // circular dependency on the api client (see infrastructure.ru.md §5).
  {
    files: ['utils/authQueue.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...RESTRICTED_SYNTAX.filter(
          (r) => !r.selector.includes("callee.name='fetch'"),
        ),
      ],
    },
  },

  // SecureStore is the storage layer itself in these files — they are the
  // legitimate import sites for `expo-secure-store`.
  //   - utils/tokens.ts          : access/refresh tokens
  //   - utils/signupDraftStorage : PII signup draft (encrypted)
  //   - utils/push.ts            : persisted push idempotency key
  //   - utils/device.ts          : stable device id
  {
    files: [
      'utils/tokens.ts',
      'utils/signupDraftStorage.ts',
      'utils/push.ts',
      'utils/device.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Tests: relax the sensitive-identifier rule because fixtures often use
  // names like `password` or `token` literally, and console.* in tests is
  // fine.
  {
    files: ['__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...RESTRICTED_SYNTAX.filter(
          (r) =>
            !r.selector.includes("callee.object.name='console'") &&
            !r.selector.includes("callee.name='fetch'"),
        ),
      ],
    },
  },
];
