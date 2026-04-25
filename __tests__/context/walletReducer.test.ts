// Unit tests for the WalletContext reducer — covers the critical AUTH/*,
// WALLET/HYDRATE_FROM_STATE, REWARDS/* and NOTIFICATIONS/* branches that
// drive cold-start, login, and the home screen aggregates.

import {
  defaultState,
  initialSignupDraft,
  walletReducer,
  type User,
  type WalletState,
} from '@/context/WalletContext';
import type { WalletStateData, WalletStateWallet } from '@/types/wallet';
import type { Reward, RewardsSummary, Tier } from '@/types/loyalty';
import type { Notification } from '@/types/notifications';
import type { TransactionRecord } from '@/types/transactions';

// --- Fixtures --------------------------------------------------------------

const fixtureUser: User = {
  id: 'cust_1',
  firstName: 'Alex',
  lastName: 'Smith',
  dob: '1990-01-01',
  email: 'alex@example.com',
  phoneE164: '+447911123456',
  signupMethod: 'email',
};

const fixtureWallet: WalletStateWallet = {
  id: 'wal_1',
  status: 'active',
  currency: 'GBP',
  balance: { amountMinor: 5000, currency: 'GBP' },
  pendingBalance: { amountMinor: 0, currency: 'GBP' },
};

const fixtureWalletStateData: WalletStateData = {
  wallet: fixtureWallet,
  card: {
    id: 'crd_1',
    status: 'active',
    brand: 'visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2030,
    isPrimary: true,
    tokenizationStatus: 'provisioned',
  },
  tier: {
    currentLevel: 'silver',
    nextLevel: 'gold',
    progress: { amountMinor: 12000, currency: 'GBP' },
    target: { amountMinor: 50000, currency: 'GBP' },
    currency: 'GBP',
    windowEndsAt: '2026-12-31T23:59:59Z',
    currentCashbackRateBps: 100,
  },
  autoReload: null,
};

const fixtureReward = (id: string, status: Reward['status'] = 'available'): Reward => ({
  id,
  bucket: 'cashback',
  source: 'cashback',
  title: `Reward ${id}`,
  description: null,
  amount: { amountMinor: 250, currency: 'GBP' },
  status,
  earnedAt: '2026-04-20T12:00:00Z',
  availableFrom: null,
  expiresAt: null,
  claimedAt: null,
  linkedTransactionId: null,
  merchantName: null,
  merchantCategory: null,
  tier: null,
  claim: { canClaim: false, targets: [], notClaimableReason: null },
});

const fixtureRewardsSummary: RewardsSummary = {
  earnedAllTimeMinor: 1000,
  pendingMinor: 200,
  currency: 'GBP',
};

const fixtureNotification = (id: string, readAt: string | null = null): Notification => ({
  id,
  type: 'topup_completed',
  severity: 'info',
  title: 'Top-up done',
  body: 'Your top-up has completed.',
  data: {},
  icon: null,
  actionLabel: null,
  actionRoute: null,
  readAt,
  deliveredAt: '2026-04-25T11:00:00Z',
  createdAt: '2026-04-25T11:00:00Z',
});

const fixtureTransaction = (id: string): TransactionRecord => ({
  id,
  type: 'topup',
  status: 'completed',
  amount: { amountMinor: 1000, currency: 'GBP' },
  merchantName: null,
  merchantCategory: null,
  merchantLogoUrl: null,
  reference: null,
  description: null,
  linkedTransactionId: null,
  cashbackEarnedMinor: null,
  cashbackCurrency: null,
  cashbackAvailableAt: null,
  occurredAt: '2026-04-25T11:00:00Z',
});

const fixtureTier: Tier = {
  current: {
    code: 'silver',
    name: 'Silver',
    levelOrder: 1,
    cashbackRateBps: 100,
    cashbackRateDisplay: '1%',
  },
  next: null,
  progress: {
    amount: { amountMinor: 0, currency: 'GBP' },
    percentage: 0,
  },
  resetDays: 30,
  windowDays: 30,
  windowResetsAt: null,
};

// --- AUTH slice -----------------------------------------------------------

describe('walletReducer › AUTH/*', () => {
  it('AUTH/UPDATE_DRAFT performs a partial merge', () => {
    const next = walletReducer(defaultState, {
      type: 'AUTH/UPDATE_DRAFT',
      payload: { firstName: 'Alex', method: 'email' },
    });
    expect(next.signupDraft.firstName).toBe('Alex');
    expect(next.signupDraft.method).toBe('email');
    // Untouched field stays at default.
    expect(next.signupDraft.lastName).toBeNull();
  });

  it('AUTH/RESET_DRAFT collapses the draft back to initial', () => {
    const seed: WalletState = {
      ...defaultState,
      signupDraft: { ...initialSignupDraft, firstName: 'Alex' },
    };
    const next = walletReducer(seed, { type: 'AUTH/RESET_DRAFT' });
    expect(next.signupDraft).toEqual(initialSignupDraft);
  });

  it('AUTH/LOGIN_SUCCESS sets user, completes onboarding, clears draft and last error', () => {
    const seed: WalletState = {
      ...defaultState,
      signupDraft: { ...initialSignupDraft, firstName: 'Alex' },
      lastAuthError: 'previously failed',
    };
    const next = walletReducer(seed, {
      type: 'AUTH/LOGIN_SUCCESS',
      payload: {
        user: fixtureUser,
        onboardingComplete: true,
        walletSummary: {
          id: 'wal_1',
          status: 'active',
          balance: { amountMinor: 5000, currency: 'GBP' },
          pendingBalance: { amountMinor: 0, currency: 'GBP' },
        },
      },
    });
    expect(next.user).toEqual(fixtureUser);
    expect(next.onboardingComplete).toBe(true);
    expect(next.signupDraft).toEqual(initialSignupDraft);
    expect(next.lastAuthError).toBeNull();
    expect(next.wallet).not.toBeNull();
    expect(next.wallet?.balance.amountMinor).toBe(5000);
  });

  it('AUTH/LOGIN_SUCCESS preserves existing wallet when no walletSummary is sent', () => {
    const seed: WalletState = { ...defaultState, wallet: fixtureWallet };
    const next = walletReducer(seed, {
      type: 'AUTH/LOGIN_SUCCESS',
      payload: { user: fixtureUser, onboardingComplete: true },
    });
    expect(next.wallet).toBe(fixtureWallet);
  });

  it('AUTH/LOGOUT resets to defaultState but preserves pendingReferralCode', () => {
    const seed: WalletState = {
      ...defaultState,
      user: fixtureUser,
      wallet: fixtureWallet,
      pendingReferralCode: 'FRIEND10',
    };
    const next = walletReducer(seed, { type: 'AUTH/LOGOUT' });
    expect(next.user).toBeNull();
    expect(next.wallet).toBeNull();
    expect(next.initialized).toBe(true);
    expect(next.pendingReferralCode).toBe('FRIEND10');
  });
});

// --- WALLET slice ---------------------------------------------------------

describe('walletReducer › WALLET/*', () => {
  it('WALLET/HYDRATE_FROM_STATE replaces the wallet, card, tierSummary and autoReload slices', () => {
    const next = walletReducer(defaultState, {
      type: 'WALLET/HYDRATE_FROM_STATE',
      payload: fixtureWalletStateData,
    });
    expect(next.wallet).toBe(fixtureWalletStateData.wallet);
    expect(next.card).toBe(fixtureWalletStateData.card);
    expect(next.tierSummary).toBe(fixtureWalletStateData.tier);
    expect(next.autoReload).toBe(fixtureWalletStateData.autoReload);
  });

  it('WALLET/SET_BALANCE merges new balance fields onto the existing wallet', () => {
    const seed: WalletState = { ...defaultState, wallet: fixtureWallet };
    const next = walletReducer(seed, {
      type: 'WALLET/SET_BALANCE',
      payload: {
        available: { amountMinor: 7500, currency: 'GBP' },
        pending: { amountMinor: 100, currency: 'GBP' },
        status: 'active',
      },
    });
    expect(next.wallet?.balance.amountMinor).toBe(7500);
    expect(next.wallet?.pendingBalance.amountMinor).toBe(100);
    expect(next.wallet?.id).toBe('wal_1');
    expect(next.wallet?.currency).toBe('GBP');
  });

  it('WALLET/SET_BALANCE is a no-op when no wallet is hydrated', () => {
    const next = walletReducer(defaultState, {
      type: 'WALLET/SET_BALANCE',
      payload: {
        available: { amountMinor: 7500, currency: 'GBP' },
        pending: { amountMinor: 0, currency: 'GBP' },
        status: 'active',
      },
    });
    expect(next.wallet).toBeNull();
  });
});

// --- REWARDS slice --------------------------------------------------------

describe('walletReducer › REWARDS/*', () => {
  it('REWARDS/SET replaces the rewards list', () => {
    const seed: WalletState = {
      ...defaultState,
      rewards: [fixtureReward('r0')],
    };
    const next = walletReducer(seed, {
      type: 'REWARDS/SET',
      payload: [fixtureReward('r1'), fixtureReward('r2')],
    });
    expect(next.rewards?.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('REWARDS/SET_SUMMARY replaces the rewards summary', () => {
    const next = walletReducer(defaultState, {
      type: 'REWARDS/SET_SUMMARY',
      payload: fixtureRewardsSummary,
    });
    expect(next.rewardsSummary).toBe(fixtureRewardsSummary);
  });

  it('REWARDS/UPSERT replaces an existing reward by id', () => {
    const seed: WalletState = {
      ...defaultState,
      rewards: [fixtureReward('r1', 'pending')],
    };
    const updated = { ...fixtureReward('r1'), status: 'claimed' as const };
    const next = walletReducer(seed, { type: 'REWARDS/UPSERT', payload: updated });
    expect(next.rewards).toHaveLength(1);
    expect(next.rewards?.[0].status).toBe('claimed');
  });

  it('REWARDS/UPSERT prepends a new reward', () => {
    const seed: WalletState = {
      ...defaultState,
      rewards: [fixtureReward('r1')],
    };
    const next = walletReducer(seed, {
      type: 'REWARDS/UPSERT',
      payload: fixtureReward('r2'),
    });
    expect(next.rewards?.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('TIER/SET stores the full Tier payload', () => {
    const next = walletReducer(defaultState, { type: 'TIER/SET', payload: fixtureTier });
    expect(next.tier).toBe(fixtureTier);
  });
});

// --- NOTIFICATIONS slice --------------------------------------------------

describe('walletReducer › NOTIFICATIONS/*', () => {
  it('NOTIFICATIONS/MARK_READ flips a single row readAt and decrements unread count', () => {
    const seed: WalletState = {
      ...defaultState,
      notifications: [
        fixtureNotification('n1', null),
        fixtureNotification('n2', null),
      ],
      unreadNotificationsCount: 2,
    };
    const next = walletReducer(seed, {
      type: 'NOTIFICATIONS/MARK_READ',
      payload: { id: 'n1', readAt: '2026-04-25T12:00:00Z' },
    });
    expect(next.notifications?.find((n) => n.id === 'n1')?.readAt).toBe(
      '2026-04-25T12:00:00Z',
    );
    expect(next.notifications?.find((n) => n.id === 'n2')?.readAt).toBeNull();
    expect(next.unreadNotificationsCount).toBe(1);
  });

  it('NOTIFICATIONS/MARK_READ leaves count untouched when row was already read', () => {
    const seed: WalletState = {
      ...defaultState,
      notifications: [fixtureNotification('n1', '2026-04-25T11:00:00Z')],
      unreadNotificationsCount: 1,
    };
    const next = walletReducer(seed, {
      type: 'NOTIFICATIONS/MARK_READ',
      payload: { id: 'n1', readAt: '2026-04-25T12:00:00Z' },
    });
    expect(next.unreadNotificationsCount).toBe(1);
  });
});

// --- TRANSACTIONS slice ---------------------------------------------------

describe('walletReducer › TRANSACTIONS/APPEND', () => {
  it('appends only items whose ids are not already present', () => {
    const seed: WalletState = {
      ...defaultState,
      transactions: [fixtureTransaction('t1'), fixtureTransaction('t2')],
    };
    const next = walletReducer(seed, {
      type: 'TRANSACTIONS/APPEND',
      payload: { items: [fixtureTransaction('t2'), fixtureTransaction('t3')] },
    });
    expect(next.transactions?.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
  });

  it('treats null current list as an empty list', () => {
    const next = walletReducer(defaultState, {
      type: 'TRANSACTIONS/APPEND',
      payload: { items: [fixtureTransaction('t1')] },
    });
    expect(next.transactions?.map((t) => t.id)).toEqual(['t1']);
  });
});
