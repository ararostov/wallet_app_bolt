export interface User {
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone?: string;
  referralCode?: string;
  signupMethod: 'phone' | 'email';
}

export interface WalletData {
  balance: number;
  bonusState: 'pending' | 'progress' | 'unlocked';
  topUpTarget: number;
  bonusAmount: number;
  bonusDaysLeft: number;
}

export interface Card {
  holderName: string;
  last4: string;
  pan?: string;
  expiry: string;
  cvv?: string;
  status: 'active' | 'frozen' | 'closed' | 'not_issued';
  addedToAppleWallet: boolean;
  addedToGoogleWallet: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  dailySpent: number;
  monthlySpent: number;
}

export interface Transaction {
  id: string;
  type: 'topup' | 'purchase' | 'cashback' | 'bonus' | 'refund';
  amount: number;
  method: string;
  date: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  merchant?: string;
  category?: string;
  cashbackEarned?: number;
  reference: string;
  cashbackAvailableFrom?: string;
  linkedTxId?: string;
  merchantLogo?: string;
}

export interface Reward {
  id: string;
  source: string;
  bucket: 'cashback' | 'bonus' | 'promo';
  amount: number;
  earnedAt: string;
  expiresAt: string;
  status: 'available' | 'pending' | 'expired' | 'claimed';
  linkedTxId?: string;
}

export interface Tier {
  current: 'Silver' | 'Gold' | 'Platinum';
  next: 'Gold' | 'Platinum' | null;
  progressGBP: number;
  targetGBP: number;
  resetDays: number;
}

export interface AutoReload {
  enabled: boolean;
  triggerBelow: number;
  topUpTo: number;
  source: string;
  bonusRate: number;
}

export interface Friend {
  id: string;
  nameOrAlias: string;
  avatarInitial?: string;
  stage: 'invited' | 'joined' | 'topped_up' | 'reward_posted';
  sentAt: string;
  joinedAt?: string;
  rewardAmount?: number;
}

export interface ReferralProgram {
  code: string;
  link: string;
  invited: number;
  joined: number;
  earned: number;
  monthlyRewardedCap: number;
  monthlyRewardedUsed: number;
  friends: Friend[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay' | 'bank_transfer';
  label: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface Perk {
  id: string;
  title: string;
  description: string;
  shortRule: string;
  fullRules: string;
  status: 'active' | 'available' | 'coming_soon';
  category: 'cashback' | 'bonus' | 'tier' | 'referral' | 'promo';
  progress?: number;
  target?: number;
  cap?: number;
  expiresAt?: string;
  icon: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'transaction' | 'reward' | 'security' | 'promo' | 'tier';
  read: boolean;
  date: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface Consent {
  id: string;
  label: string;
  description: string;
  required: boolean;
  accepted: boolean;
}

export interface Dispute {
  txId: string;
  reason: string;
  description: string;
  submittedAt: string;
  reference: string;
  status: 'open' | 'investigating' | 'resolved';
}

export interface NotificationSettings {
  masterEnabled: boolean;
  transactions: boolean;
  rewards: boolean;
  security: boolean;
  promotions: boolean;
  tier: boolean;
}
