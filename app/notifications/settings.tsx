// Notification settings screen — wired to GET / PATCH /notifications/settings.
// Master push toggle, per-category push toggles, quiet hours with HH:MM
// pickers and IANA timezone autodetected from `expo-localization`.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Lock } from 'lucide-react-native';
import * as Localization from 'expo-localization';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { useTheme } from '@/context/ThemeContext';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useUpdateNotificationSettings } from '@/hooks/useUpdateNotificationSettings';
import type {
  NotificationCategory,
  UpdateNotificationSettingsRequest,
} from '@/types/notifications';
import {
  getPushPermissionStatus,
  requestPushPermissions,
  type PushPermissionStatus,
} from '@/utils/push';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { logError } from '@/utils/logger';

const CATEGORY_LABELS: Record<NotificationCategory, { label: string; desc: string }> = {
  transactions: {
    label: 'Transactions',
    desc: 'Top-ups, purchases, refunds and card limits.',
  },
  rewards: {
    label: 'Rewards',
    desc: 'Cashback, available rewards and friend referrals.',
  },
  security: {
    label: 'Security',
    desc: 'Login alerts and other security events.',
  },
  promo: {
    label: 'Promotions',
    desc: 'Special offers and seasonal promotions.',
  },
  tier: {
    label: 'Tier updates',
    desc: 'Tier upgrades, downgrades and progress.',
  },
};

function detectTimezone(): string {
  try {
    const calendars = Localization.getCalendars();
    const tz = calendars[0]?.timeZone;
    if (tz) return tz;
  } catch {
    // fall through
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
  } catch {
    return 'Europe/London';
  }
}

function parseHHMM(value: string | null): Date {
  const base = new Date();
  base.setSeconds(0, 0);
  if (!value) {
    base.setHours(22, 0, 0, 0);
    return base;
  }
  const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(value);
  if (!match) {
    base.setHours(22, 0, 0, 0);
    return base;
  }
  base.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return base;
}

function formatHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const { data: settings, loading, error: loadError, refresh } = useNotificationSettings();
  const { updateSettings, loading: saving } = useUpdateNotificationSettings();

  const [permission, setPermission] = useState<PushPermissionStatus>('undetermined');
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    void getPushPermissionStatus().then(setPermission);
  }, []);

  const onPatch = async (
    payload: UpdateNotificationSettingsRequest,
  ): Promise<void> => {
    try {
      await updateSettings(payload);
      setBannerError(null);
    } catch (e) {
      const message =
        e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Could not save settings.';
      setBannerError(message);
    }
  };

  const onMasterToggle = (value: boolean): void => {
    void onPatch({ masterPushEnabled: value });
  };

  const onCategoryToggle = (category: NotificationCategory, value: boolean): void => {
    if (category === 'security') return; // locked
    void onPatch({ categories: { [category]: { push: value } } });
  };

  const onQuietToggle = (value: boolean): void => {
    if (value) {
      void onPatch({
        quietHours: {
          start: '22:00',
          end: '08:00',
          timezone: detectTimezone(),
        },
      });
    } else {
      void onPatch({ quietHours: { start: null, end: null, timezone: null } });
    }
  };

  const onTimeChange = (which: 'start' | 'end') =>
    (event: DateTimePickerEvent, selected?: Date): void => {
      // Android: dismiss the picker on every event regardless of action.
      if (Platform.OS === 'android') setPickerOpen(null);
      if (event.type === 'dismissed' || !selected || !settings) return;
      const formatted = formatHHMM(selected);
      const current = settings.quietHours;
      void onPatch({
        quietHours: {
          start: which === 'start' ? formatted : current.start,
          end: which === 'end' ? formatted : current.end,
          timezone: current.timezone ?? detectTimezone(),
        },
      });
    };

  const onRequestPermission = async (): Promise<void> => {
    try {
      const status = await requestPushPermissions();
      setPermission(status);
      if (status === 'denied') {
        // User dismissed or cannot be re-prompted — surface system settings link.
        Linking.openSettings().catch(() => undefined);
      }
    } catch (e) {
      logError(e, { where: 'requestPushPermissions' });
    }
  };

  const onOpenSystemSettings = (): void => {
    Linking.openSettings().catch(() => undefined);
  };

  const initialErrorMessage = useMemo<string | null>(() => {
    if (!loadError) return null;
    if (loadError instanceof ApiError) return mapErrorCode(loadError.code) ?? loadError.message;
    return 'Could not load notification settings.';
  }, [loadError]);

  const quietHoursEnabled = !!(
    settings &&
    settings.quietHours.start !== null &&
    settings.quietHours.end !== null &&
    settings.quietHours.timezone !== null
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notification settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading && !settings ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : initialErrorMessage && !settings ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.textTertiary }]}>{initialErrorMessage}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void refresh()}
            style={[styles.retryBtn, { backgroundColor: colors.surfaceAlt }]}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : settings ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
          {permission !== 'granted' ? (
            <View style={[styles.banner, { backgroundColor: '#fffbeb', borderColor: '#fed7aa' }]}>
              <Text style={[styles.bannerTitle, { color: '#92400e' }]}>
                {permission === 'denied'
                  ? 'Notifications are off in system settings'
                  : 'Enable notifications'}
              </Text>
              <Text style={[styles.bannerText, { color: '#92400e' }]}>
                {permission === 'denied'
                  ? "You won't get push alerts until they are re-enabled."
                  : 'Allow notifications to receive real-time alerts.'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={
                  permission === 'denied' ? onOpenSystemSettings : () => void onRequestPermission()
                }
                style={[styles.bannerBtn, { backgroundColor: '#92400e' }]}
              >
                <Text style={styles.bannerBtnText}>
                  {permission === 'denied' ? 'Open Settings' : 'Enable'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {bannerError ? (
            <View style={[styles.banner, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Text style={[styles.bannerText, { color: '#b91c1c' }]}>{bannerError}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setBannerError(null)}
                style={[styles.bannerBtn, { backgroundColor: '#b91c1c' }]}
              >
                <Text style={styles.bannerBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>All notifications</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Master switch for push delivery.
                </Text>
              </View>
              <Switch
                accessibilityRole="switch"
                value={settings.masterPushEnabled}
                onValueChange={onMasterToggle}
                disabled={saving}
                trackColor={{ false: colors.border, true: isDark ? '#1E40AF' : '#bfdbfe' }}
                thumbColor={settings.masterPushEnabled ? colors.primary : colors.surface}
              />
            </View>
          </View>

          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Categories</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((cat, idx, arr) => {
              const meta = CATEGORY_LABELS[cat];
              const toggles = settings.categories[cat];
              const locked = toggles.locked === true;
              const value = toggles.push && settings.masterPushEnabled;
              return (
                <View
                  key={cat}
                  style={[
                    styles.row,
                    idx < arr.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }],
                  ]}
                >
                  <View style={styles.rowContent}>
                    <View style={styles.rowTitleLine}>
                      <Text
                        style={[
                          styles.rowLabel,
                          { color: colors.text },
                          (!settings.masterPushEnabled || locked) && { color: colors.textTertiary },
                        ]}
                      >
                        {meta.label}
                      </Text>
                      {locked ? (
                        <Lock
                          size={14}
                          color={colors.textTertiary}
                          accessibilityLabel="Cannot be disabled"
                        />
                      ) : null}
                    </View>
                    <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{meta.desc}</Text>
                  </View>
                  <Switch
                    accessibilityRole="switch"
                    accessibilityState={{ disabled: locked || !settings.masterPushEnabled }}
                    value={locked ? true : value}
                    onValueChange={(v) => onCategoryToggle(cat, v)}
                    disabled={locked || !settings.masterPushEnabled || saving}
                    trackColor={{ false: colors.border, true: isDark ? '#1E40AF' : '#bfdbfe' }}
                    thumbColor={
                      (locked ? true : value) ? colors.primary : colors.surface
                    }
                  />
                </View>
              );
            })}
          </View>

          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Quiet hours</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            <View style={[styles.row, styles.rowBorder, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Enable quiet hours</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Mute pushes during a window each day.
                </Text>
              </View>
              <Switch
                accessibilityRole="switch"
                value={quietHoursEnabled}
                onValueChange={onQuietToggle}
                disabled={saving}
                trackColor={{ false: colors.border, true: isDark ? '#1E40AF' : '#bfdbfe' }}
                thumbColor={quietHoursEnabled ? colors.primary : colors.surface}
              />
            </View>
            {quietHoursEnabled ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.row, styles.rowBorder, { borderBottomColor: colors.borderLight }]}
                  onPress={() => setPickerOpen('start')}
                >
                  <Text style={[styles.rowLabel, { color: colors.text }]}>From</Text>
                  <Text style={[styles.rowValue, { color: colors.primary }]}>
                    {settings.quietHours.start ?? '—'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.row, styles.rowBorder, { borderBottomColor: colors.borderLight }]}
                  onPress={() => setPickerOpen('end')}
                >
                  <Text style={[styles.rowLabel, { color: colors.text }]}>To</Text>
                  <Text style={[styles.rowValue, { color: colors.primary }]}>
                    {settings.quietHours.end ?? '—'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Timezone</Text>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                    {settings.quietHours.timezone ?? '—'}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {pickerOpen ? (
            <DateTimePicker
              value={parseHHMM(
                pickerOpen === 'start' ? settings.quietHours.start : settings.quietHours.end,
              )}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange(pickerOpen)}
            />
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  scroll: { padding: 16 },
  banner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  bannerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
  bannerText: { fontFamily: 'Inter-Regular', fontSize: 14 },
  bannerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  bannerBtnText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 14 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1 },
  rowContent: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  rowDesc: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2, lineHeight: 18 },
  rowValue: { fontSize: 15, fontFamily: 'Inter-Medium' },
});
