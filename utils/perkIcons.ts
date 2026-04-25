// Lucide icon whitelist for perks (spec 07-loyalty §2). Backend sends an
// icon key string; mobile maps it to a bundled lucide-react-native
// component. Unknown keys fall back to `Sparkles`.

import {
  BadgeCheck,
  Coins,
  Crown,
  Gift,
  Hourglass,
  Plane,
  Receipt,
  Sparkles,
  Star,
  Sun,
  Tag,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

export const PERK_ICON_MAP: Record<string, LucideIcon> = {
  gift: Gift,
  wallet: Wallet,
  sparkles: Sparkles,
  trophy: Trophy,
  coins: Coins,
  'badge-check': BadgeCheck,
  hourglass: Hourglass,
  timer: Timer,
  receipt: Receipt,
  tag: Tag,
  star: Star,
  users: Users,
  target: Target,
  'trending-up': TrendingUp,
  sun: Sun,
  plane: Plane,
  crown: Crown,
  zap: Zap,
};

export function getPerkIcon(key: string | null | undefined): LucideIcon {
  if (!key) return Sparkles;
  return PERK_ICON_MAP[key] ?? Sparkles;
}
