// PaymentMethodRow — feature-specific row used by the payment-methods list
// screen and (forthcoming, spec 05) the top-up method selector.
//
// Branches presentation on `paymentMethod.type`:
//   - scheme / apple_pay / google_pay → brand label + "Ending {last4}"
//   - open_banking → bank name + "Bank transfer · Open Banking"
//
// The row never renders inline action menus — the list screen owns the
// BottomSheet / ConfirmDialog flow and just listens for `onPress`.

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Building2, Check, CreditCard, Smartphone } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import type { PaymentMethod } from '@/types/paymentMethods';

export interface PaymentMethodRowProps {
  method: PaymentMethod;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  testID?: string;
}

function humaniseBrand(brand: string | null): string | null {
  if (!brand) return null;
  if (brand === 'amex') return 'American Express';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function buildLabels(method: PaymentMethod): { primary: string; subtitle: string } {
  if (method.type === 'open_banking') {
    return {
      primary: method.bankName ?? 'Bank account',
      subtitle: 'Bank transfer · Open Banking',
    };
  }
  const brand = humaniseBrand(method.brand);
  if (method.type === 'apple_pay') {
    return {
      primary: 'Apple Pay',
      subtitle: brand && method.panLast4
        ? `${brand} ending ${method.panLast4}`
        : brand ?? (method.panLast4 ? `Ending ${method.panLast4}` : 'Device wallet'),
    };
  }
  if (method.type === 'google_pay') {
    return {
      primary: 'Google Pay',
      subtitle: brand && method.panLast4
        ? `${brand} ending ${method.panLast4}`
        : brand ?? (method.panLast4 ? `Ending ${method.panLast4}` : 'Device wallet'),
    };
  }
  // scheme
  const last4 = method.panLast4;
  const expiry =
    method.expiryMonth != null && method.expiryYear != null
      ? ` · Exp ${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}`
      : '';
  return {
    primary: brand ?? 'Card',
    subtitle: last4 ? `Ending ${last4}${expiry}` : 'Card on file',
  };
}

export function PaymentMethodRow({
  method,
  onPress,
  selected,
  disabled,
  testID,
}: PaymentMethodRowProps) {
  const { colors, isDark } = useTheme();
  const { primary, subtitle } = buildLabels(method);

  const Icon =
    method.type === 'open_banking'
      ? Building2
      : method.type === 'apple_pay' || method.type === 'google_pay'
        ? Smartphone
        : CreditCard;

  const accessibilityLabel = [
    primary,
    subtitle,
    method.isDefault ? 'default' : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        disabled && styles.disabled,
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: isDark ? colors.surfaceAlt : colors.primaryLight },
        ]}
      >
        {method.bankLogoUrl ? (
          <Image
            source={{ uri: method.bankLogoUrl }}
            style={styles.bankLogo}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Icon size={20} color={colors.primary} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.primary, { color: colors.text }]} numberOfLines={1}>
          {primary}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      <View style={styles.right}>
        {method.isDefault && (
          <View
            style={[styles.defaultBadge, { backgroundColor: colors.greenLight }]}
            accessibilityLabel="Default payment method"
          >
            <Check size={12} color={colors.green} />
            <Text style={[styles.defaultText, { color: colors.green }]}>
              Default
            </Text>
          </View>
        )}
        {selected && !method.isDefault && (
          <Check size={20} color={colors.primary} />
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  disabled: { opacity: 0.5 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bankLogo: { width: 32, height: 32, borderRadius: 8 },
  info: { flex: 1 },
  primary: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  subtitle: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  defaultText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
