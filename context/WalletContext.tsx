import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthEvents } from '../utils/authEvents';
import { setReferralDeepLinkListener } from '../utils/deepLinks';
import type {
  User,
  WalletData,
  Card,
  Transaction,
  Reward,
  Tier,
  AutoReload,
  ReferralProgram,
  PaymentMethod,
  Perk,
  Notification,
  Dispute,
  NotificationSettings,
} from '../types';
import type { AuthChannel, AuthUser, WalletSummary } from '../types/auth';
import type {
  AccountDeletionStatus,
  ContactChangeInProgress,
  ProfileConsent,
} from '../types/profile';
import {
  MOCK_TRANSACTIONS,
  MOCK_REWARDS,
  MOCK_PERKS,
  MOCK_FRIENDS,
  MOCK_NOTIFICATIONS,
  MOCK_PAYMENT_METHODS,
} from '../data/mockData';

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
  wallet: WalletData;
  card: Card;
  transactions: Transaction[];
  rewards: Reward[];
  perks: Perk[];
  tier: Tier;
  autoReload: AutoReload;
  referral: ReferralProgram;
  paymentMethods: PaymentMethod[];
  notifications: Notification[];
  consents: ProfileConsent[] | null;
  marketingOptIn: boolean;
  contactChangeInProgress: ContactChangeInProgress | null;
  accountDeletion: AccountDeletionStatus | null;
  disputes: Dispute[];
  notificationSettings: NotificationSettings;
  dismissedBanners: string[];
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
  | { type: 'TOP_UP'; payload: { amount: number; method: string } }
  | { type: 'FREEZE_CARD' }
  | { type: 'UNFREEZE_CARD' }
  | { type: 'ADD_TO_APPLE_WALLET' }
  | { type: 'ADD_TO_GOOGLE_WALLET' }
  | { type: 'ADD_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'REMOVE_PAYMENT_METHOD'; payload: string }
  | { type: 'SET_DEFAULT_PAYMENT_METHOD'; payload: string }
  | { type: 'UPDATE_AUTO_RELOAD'; payload: Partial<AutoReload> }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'SUBMIT_DISPUTE'; payload: Dispute }
  | { type: 'UPDATE_NOTIFICATION_SETTINGS'; payload: Partial<NotificationSettings> }
  | { type: 'DISMISS_BANNER'; payload: string }
  | { type: 'DELETE_CARD' }
  | { type: 'LOGOUT' }
  // --- Auth slice (spec 00-auth) ---
  | { type: 'AUTH/UPDATE_DRAFT'; payload: Partial<SignupDraft> }
  | { type: 'AUTH/RESET_DRAFT' }
  | { type: 'AUTH/LOGIN_SUCCESS'; payload: AuthLoginPayload }
  | { type: 'AUTH/LOGOUT' }
  | { type: 'AUTH/SET_REFERRAL'; payload: string }
  | { type: 'AUTH/CLEAR_REFERRAL' }
  | { type: 'AUTH/SET_LAST_ERROR'; payload: string | null }
  // --- Profile slice (spec 01-profile) ---
  | { type: 'CONSENTS/SET'; payload: { documents: ProfileConsent[]; marketingOptIn: boolean } }
  | { type: 'CONTACT_CHANGE/BEGIN'; payload: ContactChangeInProgress }
  | { type: 'CONTACT_CHANGE/UPDATE_ATTEMPTS'; payload: { attemptsRemaining: number } }
  | { type: 'CONTACT_CHANGE/COMPLETE' }
  | { type: 'CONTACT_CHANGE/ABORT' }
  | { type: 'ACCOUNT/DELETION_SCHEDULED'; payload: AccountDeletionStatus }
  | { type: 'ACCOUNT/DELETION_CLEARED' };

const initialWallet: WalletData = {
  balance: 247.5,
  bonusState: 'progress',
  topUpTarget: 500,
  bonusAmount: 10,
  bonusDaysLeft: 12,
};

const initialCard: Card = {
  holderName: 'Alex Johnson',
  last4: '8742',
  pan: '4242 4242 4242 8742',
  expiry: '09/28',
  cvv: '412',
  status: 'active',
  addedToAppleWallet: false,
  addedToGoogleWallet: false,
  dailyLimit: 1000,
  monthlyLimit: 5000,
  dailySpent: 24.5,
  monthlySpent: 325.0,
};

const initialTier: Tier = {
  current: 'Gold',
  next: 'Platinum',
  progressGBP: 825,
  targetGBP: 1000,
  resetDays: 45,
};

const initialAutoReload: AutoReload = {
  enabled: false,
  triggerBelow: 20,
  topUpTo: 100,
  source: 'Visa Debit ••4242',
  bonusRate: 2,
};

const initialReferral: ReferralProgram = {
  code: 'ALEX5XK9',
  link: 'https://wallet.app/join?ref=ALEX5XK9',
  invited: 4,
  joined: 3,
  earned: 10,
  monthlyRewardedCap: 50,
  monthlyRewardedUsed: 10,
  friends: MOCK_FRIENDS,
};

const initialNotificationSettings: NotificationSettings = {
  masterEnabled: true,
  transactions: true,
  rewards: true,
  security: true,
  promotions: false,
  tier: true,
};

const defaultState: WalletState = {
  initialized: false,
  onboardingComplete: false,
  user: null,
  wallet: initialWallet,
  card: initialCard,
  transactions: MOCK_TRANSACTIONS,
  rewards: MOCK_REWARDS,
  perks: MOCK_PERKS,
  tier: initialTier,
  autoReload: initialAutoReload,
  referral: initialReferral,
  paymentMethods: MOCK_PAYMENT_METHODS,
  notifications: MOCK_NOTIFICATIONS,
  consents: null,
  marketingOptIn: false,
  contactChangeInProgress: null,
  accountDeletion: null,
  disputes: [],
  notificationSettings: initialNotificationSettings,
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
        card: { ...state.card, holderName: `${action.payload.firstName} ${action.payload.lastName}` },
      };

    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : state.user };

    case 'TOP_UP': {
      const { amount, method } = action.payload;
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'topup',
        amount,
        method,
        date: new Date().toISOString(),
        status: 'completed',
        reference: `REF-${Date.now()}`,
        merchant: 'Wallet Top-up',
      };
      return {
        ...state,
        wallet: { ...state.wallet, balance: state.wallet.balance + amount },
        transactions: [newTx, ...state.transactions],
        tier: { ...state.tier, progressGBP: state.tier.progressGBP + amount },
      };
    }

    case 'FREEZE_CARD':
      return { ...state, card: { ...state.card, status: 'frozen' } };

    case 'UNFREEZE_CARD':
      return { ...state, card: { ...state.card, status: 'active' } };

    case 'ADD_TO_APPLE_WALLET':
      return { ...state, card: { ...state.card, addedToAppleWallet: true } };

    case 'ADD_TO_GOOGLE_WALLET':
      return { ...state, card: { ...state.card, addedToGoogleWallet: true } };

    case 'ADD_PAYMENT_METHOD':
      return { ...state, paymentMethods: [...state.paymentMethods, action.payload] };

    case 'REMOVE_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: state.paymentMethods.filter((pm) => pm.id !== action.payload),
      };

    case 'SET_DEFAULT_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: state.paymentMethods.map((pm) => ({
          ...pm,
          isDefault: pm.id === action.payload,
        })),
      };

    case 'UPDATE_AUTO_RELOAD':
      return { ...state, autoReload: { ...state.autoReload, ...action.payload } };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };

    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };

    case 'SUBMIT_DISPUTE':
      return { ...state, disputes: [...state.disputes, action.payload] };

    case 'UPDATE_NOTIFICATION_SETTINGS':
      return {
        ...state,
        notificationSettings: { ...state.notificationSettings, ...action.payload },
      };

    case 'DISMISS_BANNER':
      return {
        ...state,
        dismissedBanners: [...state.dismissedBanners, action.payload],
      };

    case 'DELETE_CARD':
      return { ...state, card: { ...state.card, status: 'not_issued' } };

    case 'LOGOUT':
      return {
        ...defaultState,
        initialized: true,
        pendingReferralCode: state.pendingReferralCode,
        // Preserve deletion-pending status across logout so the
        // "Account scheduled for deletion" screen survives sign-out.
        accountDeletion: state.accountDeletion,
      };

    // --- Auth slice ----------------------------------------------------------

    case 'AUTH/UPDATE_DRAFT':
      return {
        ...state,
        signupDraft: { ...state.signupDraft, ...action.payload },
      };

    case 'AUTH/RESET_DRAFT':
      return { ...state, signupDraft: initialSignupDraft };

    case 'AUTH/LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        onboardingComplete: action.payload.onboardingComplete,
        signupDraft: initialSignupDraft,
        lastAuthError: null,
        card: {
          ...state.card,
          holderName: `${action.payload.user.firstName} ${action.payload.user.lastName}`,
        },
      };

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

    default:
      return state;
  }
}

interface WalletContextValue {
  state: WalletState;
  dispatch: React.Dispatch<WalletAction>;
  completeOnboarding: (user: User) => void;
  updateUser: (data: Partial<User>) => void;
  topUp: (amount: number, method: string) => void;
  freezeCard: () => void;
  unfreezeCard: () => void;
  addToAppleWallet: () => void;
  addToGoogleWallet: () => void;
  addPaymentMethod: (pm: PaymentMethod) => void;
  removePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;
  updateAutoReload: (data: Partial<AutoReload>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  submitDispute: (dispute: Dispute) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  dismissBanner: (id: string) => void;
  deleteCard: () => void;
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
          // Don't restore signupDraft from disk — it's intentionally not persisted.
          const { signupDraft: _ignore, ...rest } = parsed;
          dispatch({ type: 'HYDRATE', payload: rest });
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

  // Listen for forced-logout signals from the API interceptor (refresh failure).
  useEffect(() => {
    const unsubscribe = AuthEvents.on('logout', () => {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
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

  const topUp = useCallback((amount: number, method: string) => {
    dispatch({ type: 'TOP_UP', payload: { amount, method } });
  }, []);

  const freezeCard = useCallback(() => dispatch({ type: 'FREEZE_CARD' }), []);
  const unfreezeCard = useCallback(() => dispatch({ type: 'UNFREEZE_CARD' }), []);
  const addToAppleWallet = useCallback(() => dispatch({ type: 'ADD_TO_APPLE_WALLET' }), []);
  const addToGoogleWallet = useCallback(() => dispatch({ type: 'ADD_TO_GOOGLE_WALLET' }), []);

  const addPaymentMethod = useCallback((pm: PaymentMethod) => {
    dispatch({ type: 'ADD_PAYMENT_METHOD', payload: pm });
  }, []);

  const removePaymentMethod = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PAYMENT_METHOD', payload: id });
  }, []);

  const setDefaultPaymentMethod = useCallback((id: string) => {
    dispatch({ type: 'SET_DEFAULT_PAYMENT_METHOD', payload: id });
  }, []);

  const updateAutoReload = useCallback((data: Partial<AutoReload>) => {
    dispatch({ type: 'UPDATE_AUTO_RELOAD', payload: data });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  }, []);

  const deleteNotification = useCallback((id: string) => {
    dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
  }, []);

  const submitDispute = useCallback((dispute: Dispute) => {
    dispatch({ type: 'SUBMIT_DISPUTE', payload: dispute });
  }, []);

  const updateNotificationSettings = useCallback((settings: Partial<NotificationSettings>) => {
    dispatch({ type: 'UPDATE_NOTIFICATION_SETTINGS', payload: settings });
  }, []);

  const dismissBanner = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_BANNER', payload: id });
  }, []);

  const deleteCard = useCallback(() => dispatch({ type: 'DELETE_CARD' }), []);

  const logout = useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    dispatch({ type: 'AUTH/LOGOUT' });
  }, []);

  const unreadNotificationsCount = state.notifications.filter((n) => !n.read).length;

  const availableRewards = state.rewards.filter((r) => r.status === 'available' || r.status === 'pending');
  const availableRewardsTotal = availableRewards.reduce((s, r) => s + r.amount, 0);
  const cashbackTotal = availableRewards.filter((r) => r.bucket === 'cashback').reduce((s, r) => s + r.amount, 0);
  const bonusTotal = availableRewards.filter((r) => r.bucket === 'bonus').reduce((s, r) => s + r.amount, 0);
  const promoTotal = availableRewards.filter((r) => r.bucket === 'promo').reduce((s, r) => s + r.amount, 0);

  return (
    <WalletContext.Provider
      value={{
        state,
        dispatch,
        completeOnboarding,
        updateUser,
        topUp,
        freezeCard,
        unfreezeCard,
        addToAppleWallet,
        addToGoogleWallet,
        addPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,
        updateAutoReload,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        submitDispute,
        updateNotificationSettings,
        dismissBanner,
        deleteCard,
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

// Adapter: convert AuthUser (from /me, /verify-*) into the legacy User
// shape used across screens that haven't migrated yet.
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
