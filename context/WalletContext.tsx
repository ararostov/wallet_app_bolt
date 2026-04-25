import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthEvents } from '../utils/authEvents';
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
  Consent,
  Dispute,
  NotificationSettings,
} from '../types';
import {
  MOCK_TRANSACTIONS,
  MOCK_REWARDS,
  MOCK_PERKS,
  MOCK_FRIENDS,
  MOCK_NOTIFICATIONS,
  MOCK_CONSENTS,
  MOCK_PAYMENT_METHODS,
} from '../data/mockData';

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
  consents: Consent[];
  disputes: Dispute[];
  notificationSettings: NotificationSettings;
  dismissedBanners: string[];
}

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
  | { type: 'UPDATE_CONSENT'; payload: { id: string; accepted: boolean } }
  | { type: 'SUBMIT_DISPUTE'; payload: Dispute }
  | { type: 'UPDATE_NOTIFICATION_SETTINGS'; payload: Partial<NotificationSettings> }
  | { type: 'DISMISS_BANNER'; payload: string }
  | { type: 'DELETE_CARD' }
  | { type: 'LOGOUT' };

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
  consents: MOCK_CONSENTS,
  disputes: [],
  notificationSettings: initialNotificationSettings,
  dismissedBanners: [],
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

    case 'UPDATE_CONSENT':
      return {
        ...state,
        consents: state.consents.map((c) =>
          c.id === action.payload.id ? { ...c, accepted: action.payload.accepted } : c
        ),
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
      return { ...defaultState, initialized: true };

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
  updateConsent: (id: string, accepted: boolean) => void;
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

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(walletReducer, defaultState);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          dispatch({ type: 'HYDRATE', payload: parsed });
        }
      } catch {
      } finally {
        dispatch({ type: 'SET_INITIALIZED' });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.initialized) return;
    const { initialized, ...toStore } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore)).catch(() => {});
  }, [state]);

  // Listen for forced-logout signals from the API interceptor (refresh failure).
  useEffect(() => {
    const unsubscribe = AuthEvents.on('logout', () => {
      dispatch({ type: 'LOGOUT' });
    });
    return unsubscribe;
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

  const updateConsent = useCallback((id: string, accepted: boolean) => {
    dispatch({ type: 'UPDATE_CONSENT', payload: { id, accepted } });
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
    dispatch({ type: 'LOGOUT' });
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
        updateConsent,
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
