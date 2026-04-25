import type { Transaction, Reward, PaymentMethod } from '../types';

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const yesterday = new Date(today.getTime() - 86400000);

function toISO(base: Date, hours: number, minutes: number): string {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_001',
    type: 'purchase',
    amount: -78.5,
    method: 'digital_wallet',
    date: toISO(today, 14, 20),
    status: 'completed',
    merchant: 'Tesco Extra',
    category: 'Groceries',
    cashbackEarned: 3.14,
    cashbackAvailableFrom: toISO(today, 14, 20),
    reference: 'REF-TX001',
  },
  {
    id: 'tx_002',
    type: 'cashback',
    amount: 3.14,
    method: 'Wallet',
    date: toISO(today, 14, 20),
    status: 'completed',
    merchant: 'Cashback \u00b7 Tesco Extra',
    reference: 'REF-TX002',
    linkedTxId: 'tx_001',
  },
  {
    id: 'tx_003',
    type: 'purchase',
    amount: -34.99,
    method: 'digital_wallet',
    date: toISO(today, 10, 15),
    status: 'completed',
    merchant: 'Tesco Express',
    category: 'Groceries',
    cashbackEarned: 1.4,
    cashbackAvailableFrom: toISO(today, 10, 15),
    reference: 'REF-TX003',
  },
  {
    id: 'tx_004',
    type: 'cashback',
    amount: 1.4,
    method: 'Wallet',
    date: toISO(today, 10, 15),
    status: 'completed',
    merchant: 'Cashback \u00b7 Tesco Express',
    reference: 'REF-TX004',
    linkedTxId: 'tx_003',
  },
  {
    id: 'tx_005',
    type: 'topup',
    amount: 50,
    method: 'Bank Transfer',
    date: toISO(yesterday, 13, 0),
    status: 'completed',
    reference: 'REF-TX005',
    merchant: 'Top-up',
  },
  {
    id: 'tx_006',
    type: 'purchase',
    amount: -12.3,
    method: 'digital_wallet',
    date: toISO(yesterday, 11, 45),
    status: 'completed',
    merchant: 'Tesco Metro',
    category: 'Groceries',
    cashbackEarned: 0.49,
    cashbackAvailableFrom: toISO(yesterday, 11, 45),
    reference: 'REF-TX006',
  },
  {
    id: 'tx_007',
    type: 'cashback',
    amount: 0.49,
    method: 'Wallet',
    date: toISO(yesterday, 11, 45),
    status: 'completed',
    merchant: 'Cashback \u00b7 Tesco Metro',
    reference: 'REF-TX007',
    linkedTxId: 'tx_006',
  },
  {
    id: 'tx_008',
    type: 'topup',
    amount: 100,
    method: 'Bank Transfer',
    date: '2026-04-12T09:00:00.000Z',
    status: 'completed',
    reference: 'REF-TX008',
    merchant: 'Top-up',
  },
  {
    id: 'tx_009',
    type: 'purchase',
    amount: -55.2,
    method: 'digital_wallet',
    date: '2026-04-11T16:30:00.000Z',
    status: 'completed',
    merchant: 'Tesco Extra',
    category: 'Groceries',
    cashbackEarned: 2.21,
    cashbackAvailableFrom: '2026-04-11T16:30:00.000Z',
    reference: 'REF-TX009',
  },
  {
    id: 'tx_010',
    type: 'cashback',
    amount: 2.21,
    method: 'Wallet',
    date: '2026-04-11T16:30:00.000Z',
    status: 'completed',
    merchant: 'Cashback \u00b7 Tesco Extra',
    reference: 'REF-TX010',
    linkedTxId: 'tx_009',
  },
];

export const MOCK_REWARDS: Reward[] = [
  {
    id: 'rw_001',
    source: 'Base cashback \u00b7 Tesco Extra',
    bucket: 'cashback',
    amount: 3.14,
    earnedAt: toISO(today, 14, 20),
    expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'pending',
    linkedTxId: 'tx_001',
  },
  {
    id: 'rw_002',
    source: 'Base cashback \u00b7 Tesco Express',
    bucket: 'cashback',
    amount: 1.4,
    earnedAt: toISO(today, 10, 15),
    expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'pending',
    linkedTxId: 'tx_003',
  },
  {
    id: 'rw_003',
    source: 'Base cashback \u00b7 Tesco Metro',
    bucket: 'cashback',
    amount: 0.49,
    earnedAt: toISO(yesterday, 11, 45),
    expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'available',
    linkedTxId: 'tx_006',
  },
  {
    id: 'rw_004',
    source: 'Base cashback \u00b7 Tesco Extra',
    bucket: 'cashback',
    amount: 2.21,
    earnedAt: '2026-04-11T16:30:00.000Z',
    expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'available',
    linkedTxId: 'tx_009',
  },
  {
    id: 'rw_005',
    source: 'Referral Bonus \u00b7 Alice',
    bucket: 'bonus',
    amount: 5.0,
    earnedAt: '2026-04-08T09:00:00Z',
    expiresAt: '2026-07-08T09:00:00Z',
    status: 'available',
  },
  {
    id: 'rw_006',
    source: 'Welcome bonus',
    bucket: 'bonus',
    amount: 5.0,
    earnedAt: '2026-03-15T09:00:00Z',
    expiresAt: '2026-06-15T09:00:00Z',
    status: 'available',
  },
  {
    id: 'rw_007',
    source: 'Weekend promo \u00b7 Tesco',
    bucket: 'promo',
    amount: 10.0,
    earnedAt: '2026-03-15T09:00:00Z',
    expiresAt: '2026-06-15T09:00:00Z',
    status: 'available',
  },
];

// MOCK_PERKS removed \u2014 perks are now fetched from `GET /perks` (spec 07).

// MOCK_NOTIFICATIONS removed — inbox is now fetched from /notifications (spec 09).

// Legacy mock-shape payment methods. TrueLayer Open Banking is the sole
// PSP for new methods (tech-debt §2.2), so card / Apple Pay / Google Pay
// entries have been removed. Bank-transfer mock kept as fallback for the
// auto-reload picker before `paymentMethodsApi` is hydrated.
export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm_001',
    type: 'bank_transfer',
    label: 'Bank Transfer',
    isDefault: true,
  },
];
