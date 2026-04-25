import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthEvents } from '../utils/authEvents';
import { setReferralDeepLinkListener } from '../utils/deepLinks';
import { SignupDraftStorage } from '../utils/signupDraftStorage';
import { isOtpWindowExpired, isSignupDraftEmpty } from '../utils/signupDraft';
import type { AuthChannel, AuthUser, WalletSummary } from '../types/auth';
import type {
  AccountDeletionStatus,
  ContactChangeInProgress,
  ProfileConsent,
} from '../types/profile';
import type {
  AutoReloadSummary,
  CardSummary as ApiCardSummary,
  TierSummary as ApiTierSummary,
  WalletStateData,
  WalletStateWallet,
} from '../types/wallet';
import type {
  Card as ApiCard,
  WalletProvisioningProvider,
  WalletProvisioningStatus,
} from '../types/card';
import type { MoneyAmount } from '../types/auth';
import type { PaymentMethod as ApiPaymentMethod } from '../types/paymentMethods';
import type {
  DisputeRecord,
  TransactionRecord,
} from '../types/transactions';
import type {
  Perk as ApiPerk,
  Reward as ApiReward,
  RewardsSummary,
  Tier as ApiTier,
} from '../types/loyalty';
import type {
  ReferralFriend as ApiReferralFriend,
  ReferralSummary as ApiReferralSummary,
} from '../types/referral';
import type {
  Notification as ApiNotification,
  NotificationSettings as ApiNotificationSettings,
} from '../types/notifications';

// Re-export the canonical transaction record under its legacy alias so
// existing call sites that imported ApiTransactionRecord from this module
// keep compiling without a churn-y rename. Spec 06 owns the canonical shape
// (types/transactions.ts).
export type { TransactionRecord as ApiTransactionRecord } from '../types/transactions';

// --- User --------------------------------------------------------------------
// The canonical in-app user shape. Built from `AuthUser` + the channel chosen
// at signup. Lives here (rather than a dedicated types file) because the
// reducer is the only writer.
export interface User {
  id?: string;
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone?: string;
  phoneE164?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  hasPassword?: boolean;
  hasDateOfBirth?: boolean;
  marketingOptIn?: boolean;
  referralCode?: string;
  signupMethod: AuthChannel;
}

export interface SignupDraft {
  method: AuthChannel | null;
  email: string | null;
  phoneE164: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD
  referralCode: string | null;
  acceptedConsentIds: number[];
  marketingOptIn: boolean;
  pendingCustomerId: string | null;
  verificationTarget: string | null;
  otpExpiresAt: string | null;
  resendDeadlineMs: number | null;
  registerIdempotencyKey: string | null;
}

const initialSignupDraft: SignupDraft = {
  method: null,
  email: null,
  phoneE164: null,
  firstName: null,
  lastName: null,
  dateOfBirth: null,
  referralCode: null,
  acceptedConsentIds: [],
  marketingOptIn: false,
  pendingCustomerId: null,
  verificationTarget: null,
  otpExpiresAt: null,
  resendDeadlineMs: null,
  registerIdempotencyKey: null,
};

interface WalletState {
  initialized: boolean;
  onboardingComplete: boolean;
  user: User | null;
  // --- Wallet (spec 02-wallet) ----------------------------------------------
  wallet: WalletStateWallet | null;
  // --- Card (spec 03-cards) -------------------------------------------------
  // The Card tab and limits screens always write the full `ApiCard` here;
  // /wallet/state hydrates the slimmer `ApiCardSummary` projection on first
  // load. Both share the common `id / status / brand / tokenizationStatus`
  // surface that the Home tab reads — richer fields are only consumed by the
  // Card tab (which gates on the `lifecycleStatus` discriminator).
  card: ApiCard | ApiCardSummary | null;
  cardWalletProvisioning: {
    apple: WalletProvisioningStatus;
    google: WalletProvisioningStatus;
  };
  // --- Tier (spec 02-wallet + 07-loyalty) ----------------------------------
  // `tierSummary` is the slim TierSummary from `/wallet/state` (cashback rate,
  // current/next labels, progress amount). `tier` is the full Tier payload
  // from `GET /tier` with reset window, percentage, threshold etc. They
  // coexist because /wallet/state is the cheap aggregate read and /tier is
  // the rich detail read used by the dedicated screen.
  tierSummary: ApiTierSummary | null;
  tier: ApiTier | null;
  // --- Auto-reload (spec 02-wallet) -----------------------------------------
  autoReload: AutoReloadSummary | null;
  // --- Payment methods (spec 04) -------------------------------------------
  paymentMethods: ApiPaymentMethod[] | null;
  // --- Transactions (spec 06) ----------------------------------------------
  transactions: TransactionRecord[] | null;
  // --- Disputes (spec 06) — keyed by transactionId -------------------------
  disputes: Record<string, DisputeRecord>;
  // --- Loyalty (spec 07) ----------------------------------------------------
  // `rewards` is the materialised paged feed (page 1 + appended pages).
  // `rewardsSummary` carries the two hero figures derived from the feed
  // (earned all time excluding expired/cancelled, pending cashback).
  // `perks` is the catalog from `GET /perks`.
  rewards: ApiReward[] | null;
  rewardsSummary: RewardsSummary | null;
  perks: ApiPerk[] | null;
  // --- Referral (spec 08) ---------------------------------------------------
  referralSummary: ApiReferralSummary | null;
  referralFriends: ApiReferralFriend[] | null;
  // --- Notifications (spec 09) ---------------------------------------------
  notifications: ApiNotification[] | null;
  unreadNotificationsCount: number | null;
  notificationSettings: ApiNotificationSettings | null;
  // --- Profile (spec 01) ---------------------------------------------------
  consents: ProfileConsent[] | null;
  marketingOptIn: boolean;
  contactChangeInProgress: ContactChangeInProgress | null;
  accountDeletion: AccountDeletionStatus | null;
  // --- UI banners (Home tab) -----------------------------------------------
  dismissedBanners: string[];
  // --- Auth (spec 00) ------------------------------------------------------
  signupDraft: SignupDraft;
  pendingReferralCode: string | null;
  lastAuthError: string | null;
}

type AuthLoginPayload = {
  user: User;
  walletSummary?: WalletSummary | null;
  onboardingComplete: boolean;
};

type WalletAction =
  | { type: 'HYDRATE'; payload: Partial<WalletState> }
  | { type: 'SET_INITIALIZED' }
  | { type: 'COMPLETE_ONBOARDING'; payload: User }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'DISMISS_BANNER'; payload: string }
  // --- Wallet slice (spec 02-wallet) ---------------------------------------
  | { type: 'WALLET/HYDRATE_FROM_STATE'; payload: WalletStateData }
  | { type: 'WALLET/SET_BALANCE'; payload: { available: { amountMinor: number; currency: string }; pending: { amountMinor: number; currency: string }; status: WalletStateWallet['status'] } }
  | { type: 'WALLET/SET_AUTO_RELOAD'; payload: AutoReloadSummary | null }
  // --- Card slice (spec 03-cards) ------------------------------------------
  | { type: 'CARD/SET'; payload: ApiCard | null }
  | { type: 'CARD/UPDATE_STATUS'; payload: { lifecycleStatus: ApiCard['lifecycleStatus']; status: ApiCard['status']; frozenAt?: string | null } }
  | { type: 'CARD/UPDATE_LIMITS'; payload: { dailyLimit: MoneyAmount | null; monthlyLimit: MoneyAmount | null; dailyLimitIsDefault: boolean; monthlyLimitIsDefault: boolean } }
  | { type: 'CARD/CLEAR' }
  | { type: 'CARD/SET_PROVISIONING_STATUS'; payload: { provider: WalletProvisioningProvider; status: WalletProvisioningStatus } }
  // --- Payment methods slice (spec 04-payment-methods) ---------------------
  | { type: 'PAYMENT_METHODS/SET'; payload: ApiPaymentMethod[] }
  | { type: 'PAYMENT_METHODS/UPSERT'; payload: ApiPaymentMethod }
  | { type: 'PAYMENT_METHODS/REMOVE'; payload: { id: string } }
  | { type: 'PAYMENT_METHODS/SET_DEFAULT'; payload: { id: string } }
  // --- Transactions slice (spec 06-transactions) ---------------------------
  | { type: 'TRANSACTIONS/SET'; payload: { items: TransactionRecord[] } }
  | { type: 'TRANSACTIONS/APPEND'; payload: { items: TransactionRecord[] } }
  | { type: 'TRANSACTIONS/UPSERT'; payload: TransactionRecord }
  | { type: 'TRANSACTIONS/CLEAR' }
  // --- Disputes slice (spec 06) --------------------------------------------
  | { type: 'DISPUTES/UPSERT'; payload: DisputeRecord }
  | { type: 'DISPUTES/SET_FOR_TRANSACTION'; payload: DisputeRecord }
  | { type: 'DISPUTES/CLEAR' }
  // --- Loyalty slices (spec 07-loyalty) ------------------------------------
  | { type: 'REWARDS/SET'; payload: ApiReward[] }
  | { type: 'REWARDS/APPEND'; payload: ApiReward[] }
  | { type: 'REWARDS/UPSERT'; payload: ApiReward }
  | { type: 'REWARDS/REMOVE'; payload: { id: string } }
  | { type: 'REWARDS/SET_SUMMARY'; payload: RewardsSummary }
  | { type: 'REWARDS/CLEAR' }
  | { type: 'TIER/SET'; payload: ApiTier }
  | { type: 'PERKS/SET'; payload: ApiPerk[] }
  // --- Referral slices (spec 08-referral) ----------------------------------
  | { type: 'REFERRAL/SET_SUMMARY'; payload: ApiReferralSummary }
  | { type: 'REFERRAL/SET_FRIENDS'; payload: ApiReferralFriend[] }
  | { type: 'REFERRAL/APPEND_FRIENDS'; payload: ApiReferralFriend[] }
  | { type: 'REFERRAL/UPSERT_FRIEND'; payload: ApiReferralFriend }
  | { type: 'REFERRAL/CLEAR' }
  // --- Notifications slice (spec 09-notifications) -------------------------
  | { type: 'NOTIFICATIONS/SET'; payload: { items: ApiNotification[] } }
  | { type: 'NOTIFICATIONS/APPEND'; payload: { items: ApiNotification[] } }
  | { type: 'NOTIFICATIONS/UPSERT'; payload: ApiNotification }
  | { type: 'NOTIFICATIONS/REMOVE'; payload: { id: string } }
  | { type: 'NOTIFICATIONS/MARK_READ'; payload: { id: string; readAt: string } }
  | { type: 'NOTIFICATIONS/MARK_ALL_READ'; payload: { readAt: string } }
  | { type: 'NOTIFICATIONS/SET_UNREAD_COUNT'; payload: number }
  | { type: 'NOTIFICATIONS/SET_SETTINGS'; payload: ApiNotificationSettings }
  | { type: 'NOTIFICATIONS/CLEAR' }
  // --- Auth slice (spec 00-auth) -------------------------------------------
  | { type: 'AUTH/UPDATE_DRAFT'; payload: Partial<SignupDraft> }
  | { type: 'AUTH/RESET_DRAFT' }
  | { type: 'AUTH/LOGIN_SUCCESS'; payload: AuthLoginPayload }
  | { type: 'AUTH/LOGOUT' }
  | { type: 'AUTH/SET_REFERRAL'; payload: string }
  | { type: 'AUTH/CLEAR_REFERRAL' }
  | { type: 'AUTH/SET_LAST_ERROR'; payload: string | null }
  // --- Profile slice (spec 01-profile) -------------------------------------
  | { type: 'CONSENTS/SET'; payload: { documents: ProfileConsent[]; marketingOptIn: boolean } }
  | { type: 'CONTACT_CHANGE/BEGIN'; payload: ContactChangeInProgress }
  | { type: 'CONTACT_CHANGE/UPDATE_ATTEMPTS'; payload: { attemptsRemaining: number } }
  | { type: 'CONTACT_CHANGE/COMPLETE' }
  | { type: 'CONTACT_CHANGE/ABORT' }
  | { type: 'ACCOUNT/DELETION_SCHEDULED'; payload: AccountDeletionStatus }
  | { type: 'ACCOUNT/DELETION_CLEARED' };

const defaultState: WalletState = {
  initialized: false,
  onboardingComplete: false,
  user: null,
  wallet: null,
  card: null,
  cardWalletProvisioning: { apple: 'idle', google: 'idle' },
  tierSummary: null,
  tier: null,
  autoReload: null,
  paymentMethods: null,
  transactions: null,
  disputes: {},
  rewards: null,
  rewardsSummary: null,
  perks: null,
  referralSummary: null,
  referralFriends: null,
  notifications: null,
  unreadNotificationsCount: null,
  notificationSettings: null,
  consents: null,
  marketingOptIn: false,
  contactChangeInProgress: null,
  accountDeletion: null,
  dismissedBanners: [],
  signupDraft: initialSignupDraft,
  pendingReferralCode: null,
  lastAuthError: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };

    case 'SET_INITIALIZED':
      return { ...state, initialized: true };

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        onboardingComplete: true,
        user: action.payload,
      };

    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : state.user };

    case 'DISMISS_BANNER':
      return {
        ...state,
        dismissedBanners: [...state.dismissedBanners, action.payload],
      };

    // --- Auth slice ----------------------------------------------------------

    case 'AUTH/UPDATE_DRAFT':
      return {
        ...state,
        signupDraft: { ...state.signupDraft, ...action.payload },
      };

    case 'AUTH/RESET_DRAFT':
      return { ...state, signupDraft: initialSignupDraft };

    case 'AUTH/LOGIN_SUCCESS': {
      // Hydrate the wallet slice from the auth WalletSummary if the response
      // carried one. Auth's WalletSummary is a strict subset of
      // /wallet/state.wallet (no merchantId / openedAt / currency) — fill the
      // missing currency from the balance pair so the slice is usable
      // immediately for the Home screen before /wallet/state runs.
      const summary = action.payload.walletSummary;
      const wallet: WalletStateWallet | null = summary
        ? {
            id: summary.id,
            status: summary.status,
            currency: summary.balance.currency,
            balance: summary.balance,
            pendingBalance: summary.pendingBalance,
          }
        : state.wallet;
      return {
        ...state,
        user: action.payload.user,
        onboardingComplete: action.payload.onboardingComplete,
        signupDraft: initialSignupDraft,
        lastAuthError: null,
        wallet,
      };
    }

    case 'AUTH/LOGOUT':
      return {
        ...defaultState,
        initialized: true,
        // pendingReferralCode survives logout — a deep link may have arrived earlier.
        pendingReferralCode: state.pendingReferralCode,
        // accountDeletion survives logout so the deletion-pending screen can
        // still display the schedule (spec 01-profile §5.1).
        accountDeletion: state.accountDeletion,
      };

    case 'AUTH/SET_REFERRAL':
      // If user already logged-in, stash separately so signup draft is untouched.
      if (state.user) {
        return { ...state, pendingReferralCode: action.payload };
      }
      return {
        ...state,
        signupDraft: { ...state.signupDraft, referralCode: action.payload },
      };

    case 'AUTH/CLEAR_REFERRAL':
      return { ...state, pendingReferralCode: null };

    case 'AUTH/SET_LAST_ERROR':
      return { ...state, lastAuthError: action.payload };

    // --- Profile slice ------------------------------------------------------

    case 'CONSENTS/SET':
      return {
        ...state,
        consents: action.payload.documents,
        marketingOptIn: action.payload.marketingOptIn,
      };

    case 'CONTACT_CHANGE/BEGIN':
      return { ...state, contactChangeInProgress: action.payload };

    case 'CONTACT_CHANGE/UPDATE_ATTEMPTS':
      return {
        ...state,
        contactChangeInProgress: state.contactChangeInProgress
          ? {
              ...state.contactChangeInProgress,
              attemptsRemaining: action.payload.attemptsRemaining,
            }
          : null,
      };

    case 'CONTACT_CHANGE/COMPLETE':
    case 'CONTACT_CHANGE/ABORT':
      return { ...state, contactChangeInProgress: null };

    case 'ACCOUNT/DELETION_SCHEDULED':
      return { ...state, accountDeletion: action.payload };

    case 'ACCOUNT/DELETION_CLEARED':
      return { ...state, accountDeletion: null };

    // --- Wallet slice (spec 02-wallet) -------------------------------------

    case 'WALLET/HYDRATE_FROM_STATE': {
      const { wallet, card, tier, autoReload } = action.payload;
      return {
        ...state,
        wallet,
        card,
        tierSummary: tier,
        autoReload,
      };
    }

    case 'WALLET/SET_BALANCE':
      if (!state.wallet) {
        return state;
      }
      return {
        ...state,
        wallet: {
          ...state.wallet,
          status: action.payload.status,
          balance: action.payload.available,
          pendingBalance: action.payload.pending,
        },
      };

    case 'WALLET/SET_AUTO_RELOAD':
      return { ...state, autoReload: action.payload };

    // --- Card slice (spec 03-cards) ---------------------------------------

    case 'CARD/SET':
      return { ...state, card: action.payload };

    case 'CARD/UPDATE_STATUS': {
      if (!state.card) return state;
      // Only the rich `ApiCard` shape carries `frozenAt`. When the slice
      // currently holds the slimmer `CardSummary`, we keep the partial
      // update at `status` / `lifecycleStatus` and rely on the next
      // GET /card to fully hydrate `ApiCard`.
      const next = {
        ...state.card,
        status: action.payload.status,
      } as typeof state.card;
      if (next && 'lifecycleStatus' in next) {
        (next as ApiCard).lifecycleStatus = action.payload.lifecycleStatus;
        if (action.payload.frozenAt !== undefined) {
          (next as ApiCard).frozenAt = action.payload.frozenAt;
        }
      }
      return { ...state, card: next };
    }

    case 'CARD/UPDATE_LIMITS': {
      if (!state.card || !('lifecycleStatus' in state.card)) return state;
      const card = state.card as ApiCard;
      return {
        ...state,
        card: {
          ...card,
          dailyLimit: action.payload.dailyLimit,
          monthlyLimit: action.payload.monthlyLimit,
          dailyLimitIsDefault: action.payload.dailyLimitIsDefault,
          monthlyLimitIsDefault: action.payload.monthlyLimitIsDefault,
        },
      };
    }

    case 'CARD/CLEAR':
      return {
        ...state,
        card: null,
        cardWalletProvisioning: { apple: 'idle', google: 'idle' },
      };

    case 'CARD/SET_PROVISIONING_STATUS': {
      const key = action.payload.provider === 'apple_wallet' ? 'apple' : 'google';
      return {
        ...state,
        cardWalletProvisioning: {
          ...state.cardWalletProvisioning,
          [key]: action.payload.status,
        },
      };
    }

    // --- Payment methods slice (spec 04) ----------------------------------

    case 'PAYMENT_METHODS/SET':
      return { ...state, paymentMethods: action.payload };

    case 'PAYMENT_METHODS/UPSERT': {
      const incoming = action.payload;
      const current = state.paymentMethods ?? [];
      // If the incoming row claims default, strip the flag from any other
      // active row before merging so at most one default is held locally.
      const cleared = incoming.isDefault
        ? current.map((p) => (p.id === incoming.id ? p : { ...p, isDefault: false }))
        : current;
      const idx = cleared.findIndex((p) => p.id === incoming.id);
      const next =
        idx >= 0
          ? cleared.map((p, i) => (i === idx ? incoming : p))
          : [incoming, ...cleared];
      return { ...state, paymentMethods: next };
    }

    case 'PAYMENT_METHODS/REMOVE': {
      if (!state.paymentMethods) return state;
      return {
        ...state,
        paymentMethods: state.paymentMethods.filter(
          (p) => p.id !== action.payload.id,
        ),
      };
    }

    case 'PAYMENT_METHODS/SET_DEFAULT': {
      if (!state.paymentMethods) return state;
      const id = action.payload.id;
      return {
        ...state,
        paymentMethods: state.paymentMethods.map((p) => ({
          ...p,
          isDefault: p.id === id,
        })),
      };
    }

    // --- Transactions slice (spec 05/06) ----------------------------------

    case 'TRANSACTIONS/SET':
      return { ...state, transactions: action.payload.items };

    case 'TRANSACTIONS/APPEND': {
      const current = state.transactions ?? [];
      const known = new Set(current.map((t) => t.id));
      const fresh = action.payload.items.filter((t) => !known.has(t.id));
      return { ...state, transactions: [...current, ...fresh] };
    }

    case 'TRANSACTIONS/UPSERT': {
      const incoming = action.payload;
      const current = state.transactions ?? [];
      const idx = current.findIndex((t) => t.id === incoming.id);
      const next =
        idx >= 0
          ? current.map((t, i) => (i === idx ? incoming : t))
          : [incoming, ...current];
      return { ...state, transactions: next };
    }

    case 'TRANSACTIONS/CLEAR':
      return { ...state, transactions: null };

    // --- Disputes slice (spec 06) -----------------------------------------

    case 'DISPUTES/UPSERT':
    case 'DISPUTES/SET_FOR_TRANSACTION': {
      const incoming = action.payload;
      return {
        ...state,
        disputes: { ...state.disputes, [incoming.transactionId]: incoming },
      };
    }

    case 'DISPUTES/CLEAR':
      return { ...state, disputes: {} };

    // --- Loyalty slices (spec 07) -----------------------------------------

    case 'REWARDS/SET':
      return { ...state, rewards: action.payload };

    case 'REWARDS/APPEND': {
      const current = state.rewards ?? [];
      const known = new Set(current.map((r) => r.id));
      const fresh = action.payload.filter((r) => !known.has(r.id));
      return { ...state, rewards: [...current, ...fresh] };
    }

    case 'REWARDS/UPSERT': {
      const incoming = action.payload;
      const current = state.rewards ?? [];
      const idx = current.findIndex((r) => r.id === incoming.id);
      const next =
        idx >= 0
          ? current.map((r, i) => (i === idx ? incoming : r))
          : [incoming, ...current];
      return { ...state, rewards: next };
    }

    case 'REWARDS/REMOVE': {
      if (!state.rewards) return state;
      return {
        ...state,
        rewards: state.rewards.filter((r) => r.id !== action.payload.id),
      };
    }

    case 'REWARDS/SET_SUMMARY':
      return { ...state, rewardsSummary: action.payload };

    case 'REWARDS/CLEAR':
      return { ...state, rewards: null, rewardsSummary: null };

    case 'TIER/SET':
      return { ...state, tier: action.payload };

    case 'PERKS/SET':
      return { ...state, perks: action.payload };

    // --- Referral slices (spec 08) ----------------------------------------

    case 'REFERRAL/SET_SUMMARY':
      return { ...state, referralSummary: action.payload };

    case 'REFERRAL/SET_FRIENDS':
      return { ...state, referralFriends: action.payload };

    case 'REFERRAL/APPEND_FRIENDS': {
      const current = state.referralFriends ?? [];
      const known = new Set(current.map((f) => f.id));
      const fresh = action.payload.filter((f) => !known.has(f.id));
      return { ...state, referralFriends: [...current, ...fresh] };
    }

    case 'REFERRAL/UPSERT_FRIEND': {
      const incoming = action.payload;
      const current = state.referralFriends ?? [];
      const idx = current.findIndex((f) => f.id === incoming.id);
      const next =
        idx >= 0
          ? current.map((f, i) => (i === idx ? incoming : f))
          : [incoming, ...current];
      return { ...state, referralFriends: next };
    }

    case 'REFERRAL/CLEAR':
      return { ...state, referralSummary: null, referralFriends: null };

    // --- Notifications slice (spec 09) ------------------------------------

    case 'NOTIFICATIONS/SET':
      return { ...state, notifications: action.payload.items };

    case 'NOTIFICATIONS/APPEND': {
      const current = state.notifications ?? [];
      const known = new Set(current.map((n) => n.id));
      const fresh = action.payload.items.filter((n) => !known.has(n.id));
      return { ...state, notifications: [...current, ...fresh] };
    }

    case 'NOTIFICATIONS/UPSERT': {
      const incoming = action.payload;
      const current = state.notifications ?? [];
      const idx = current.findIndex((n) => n.id === incoming.id);
      const next =
        idx >= 0
          ? current.map((n, i) => (i === idx ? incoming : n))
          : [incoming, ...current];
      return { ...state, notifications: next };
    }

    case 'NOTIFICATIONS/REMOVE': {
      if (!state.notifications) return state;
      const target = state.notifications.find((n) => n.id === action.payload.id);
      const wasUnread = target ? target.readAt === null : false;
      const nextCount =
        wasUnread && state.unreadNotificationsCount !== null
          ? Math.max(0, state.unreadNotificationsCount - 1)
          : state.unreadNotificationsCount;
      return {
        ...state,
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload.id,
        ),
        unreadNotificationsCount: nextCount,
      };
    }

    case 'NOTIFICATIONS/MARK_READ': {
      const list = state.notifications;
      if (!list) {
        return state;
      }
      const target = list.find((n) => n.id === action.payload.id);
      const wasUnread = target ? target.readAt === null : false;
      const nextCount =
        wasUnread && state.unreadNotificationsCount !== null
          ? Math.max(0, state.unreadNotificationsCount - 1)
          : state.unreadNotificationsCount;
      return {
        ...state,
        notifications: list.map((n) =>
          n.id === action.payload.id && n.readAt === null
            ? { ...n, readAt: action.payload.readAt }
            : n,
        ),
        unreadNotificationsCount: nextCount,
      };
    }

    case 'NOTIFICATIONS/MARK_ALL_READ': {
      const list = state.notifications;
      const next = list
        ? list.map((n) => (n.readAt === null ? { ...n, readAt: action.payload.readAt } : n))
        : list;
      return {
        ...state,
        notifications: next,
        unreadNotificationsCount: 0,
      };
    }

    case 'NOTIFICATIONS/SET_UNREAD_COUNT':
      return { ...state, unreadNotificationsCount: action.payload };

    case 'NOTIFICATIONS/SET_SETTINGS':
      return { ...state, notificationSettings: action.payload };

    case 'NOTIFICATIONS/CLEAR':
      return {
        ...state,
        notifications: null,
        unreadNotificationsCount: null,
        notificationSettings: null,
      };

    default:
      return state;
  }
}

interface WalletContextValue {
  state: WalletState;
  dispatch: React.Dispatch<WalletAction>;
  completeOnboarding: (user: User) => void;
  updateUser: (data: Partial<User>) => void;
  dismissBanner: (id: string) => void;
  logout: () => void;
  unreadNotificationsCount: number;
  availableRewardsTotal: number;
  cashbackTotal: number;
  bonusTotal: number;
  promoTotal: number;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const STORAGE_KEY = 'wallet_state_v1';

// Persist everything except in-memory-only flags.
// Importantly: signupDraft is in-memory only — it can carry pending PII
// (DOB, name, contact) before /auth/register has been issued.
function buildPersistPayload(state: WalletState): Partial<WalletState> {
  const {
    initialized: _initialized,
    lastAuthError: _lastAuthError,
    signupDraft: _signupDraft,
    ...rest
  } = state;
  return rest;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(walletReducer, defaultState);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<WalletState>;
          // Don't restore signupDraft from AsyncStorage — it never lives there
          // (excluded by buildPersistPayload). The encrypted SecureStore copy
          // is loaded below.
          const { signupDraft: _ignore, ...rest } = parsed;
          dispatch({ type: 'HYDRATE', payload: rest });
        }
        // Encrypted signup-draft hydration. Wipe-and-skip when the OTP
        // window has lapsed — the original code is unusable anyway and the
        // associated `pendingCustomerId` ties the user to a now-stale
        // backend record.
        const draft = await SignupDraftStorage.get();
        if (draft) {
          if (isOtpWindowExpired(draft)) {
            await SignupDraftStorage.clear();
          } else {
            dispatch({ type: 'AUTH/UPDATE_DRAFT', payload: draft });
          }
        }
      } catch {
      } finally {
        dispatch({ type: 'SET_INITIALIZED' });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.initialized) return;
    const toStore = buildPersistPayload(state);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore)).catch(() => {});
  }, [state]);

  // Persist signupDraft to SecureStore on change. Debounced ~300ms so
  // typing in the signup form doesn't hammer the keystore.
  // - Empty draft (structurally equal to initialSignupDraft) → clear.
  //   This is the cleanest place to handle AUTH/LOGIN_SUCCESS, AUTH/LOGOUT,
  //   AUTH/RESET_DRAFT — all of them collapse the slice to initial.
  // - Non-empty draft → write the JSON blob.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.initialized) return;
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    const draft = state.signupDraft;
    persistTimerRef.current = setTimeout(() => {
      if (isSignupDraftEmpty(draft)) {
        SignupDraftStorage.clear().catch(() => undefined);
      } else {
        SignupDraftStorage.set(draft).catch(() => undefined);
      }
    }, 300);
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [state.signupDraft, state.initialized]);

  // Listen for forced-logout signals from the API interceptor (refresh failure).
  useEffect(() => {
    const unsubscribe = AuthEvents.on('logout', () => {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      SignupDraftStorage.clear().catch(() => undefined);
      dispatch({ type: 'AUTH/LOGOUT' });
    });
    return unsubscribe;
  }, []);

  // Bridge deep-link `invite?code=…` into the auth slice. The handler in
  // utils/deepLinks.ts already routes to intro / referral.
  useEffect(() => {
    setReferralDeepLinkListener((code) => {
      dispatch({ type: 'AUTH/SET_REFERRAL', payload: code });
    });
    return () => {
      setReferralDeepLinkListener(null);
    };
  }, []);

  const completeOnboarding = useCallback((user: User) => {
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: user });
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
  }, []);

  const dismissBanner = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_BANNER', payload: id });
  }, []);

  const logout = useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    SignupDraftStorage.clear().catch(() => undefined);
    dispatch({ type: 'AUTH/LOGOUT' });
  }, []);

  // Bell-badge feed via spec-09 `/notifications/count`. Defaults to 0 until
  // the first fetch completes.
  const unreadNotificationsCount = state.unreadNotificationsCount ?? 0;

  // Derived reward totals from the spec-07 backend-shape rewards feed
  // (state.rewards). Stays at 0 until the rewards screen has hydrated the
  // slice — the Home tab shows "£0.00 earned" on first paint.
  const availableRewards = (state.rewards ?? []).filter(
    (r) => r.status === 'available' || r.status === 'pending',
  );
  const sumMajor = (rs: typeof availableRewards): number =>
    rs.reduce((s, r) => s + r.amount.amountMinor, 0) / 100;
  const availableRewardsTotal = sumMajor(availableRewards);
  const cashbackTotal = sumMajor(availableRewards.filter((r) => r.bucket === 'cashback'));
  const bonusTotal = sumMajor(availableRewards.filter((r) => r.bucket === 'bonus'));
  const promoTotal = sumMajor(availableRewards.filter((r) => r.bucket === 'promo'));

  return (
    <WalletContext.Provider
      value={{
        state,
        dispatch,
        completeOnboarding,
        updateUser,
        dismissBanner,
        logout,
        unreadNotificationsCount,
        availableRewardsTotal,
        cashbackTotal,
        bonusTotal,
        promoTotal,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

// Adapter: convert AuthUser (from /me, /verify-*) into the canonical User
// shape used across screens.
export function authUserToUser(auth: AuthUser, signupMethod: AuthChannel): User {
  return {
    id: auth.id,
    firstName: auth.firstName,
    lastName: auth.lastName,
    dob: '',
    email: auth.email ?? '',
    phone: auth.phoneE164 ?? undefined,
    phoneE164: auth.phoneE164 ?? undefined,
    emailVerified: auth.emailVerified,
    phoneVerified: auth.phoneVerified,
    hasPassword: auth.hasPassword,
    marketingOptIn: auth.marketingOptIn,
    signupMethod,
  };
}
