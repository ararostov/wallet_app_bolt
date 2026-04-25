import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { WalletProvider, useWallet } from '@/context/WalletContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { BottomSheetProvider } from '@/components/ui/BottomSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { handleActionRoute, handleDeepLink } from '@/utils/deepLinks';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  setupNotificationHandler,
  syncBadgeCount,
} from '@/utils/push';
import { notificationsApi } from '@/utils/api/notifications';
import { logError } from '@/utils/logger';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark } = useTheme();
  const { state, dispatch } = useWallet();
  const isAuthed = state.user !== null;
  // Track which notification IDs have already been handled in this session
  // (prevents duplicate mark-read when the same row is delivered to both
  // the foreground and the response listener).
  const handledRef = useRef<Set<string>>(new Set());

  // Configure foreground handler + Android channels once the app is up.
  useEffect(() => {
    void setupNotificationHandler();
  }, []);

  // Foreground notification listener.
  useEffect(() => {
    if (!isAuthed) return undefined;
    const sub = addNotificationReceivedListener((notification) => {
      const data = (notification.request.content.data ?? {}) as Record<string, unknown>;
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : null;
      if (notificationId && handledRef.current.has(notificationId)) return;
      // Best-effort: refresh the badge count so the bell updates without
      // pulling the full feed.
      notificationsApi
        .getCount()
        .then((r) =>
          dispatch({ type: 'NOTIFICATIONS/SET_UNREAD_COUNT', payload: r.unreadCount }),
        )
        .catch((e) => logError(e, { where: 'foregroundNotification.count' }));
    });
    return () => {
      sub.remove();
    };
  }, [isAuthed, dispatch]);

  // Notification-tap listener (background or quick-resume).
  useEffect(() => {
    if (!isAuthed) return undefined;
    const sub = addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : null;
      const actionRoute =
        typeof data.actionRoute === 'string'
          ? data.actionRoute
          : typeof data.route === 'string'
            ? data.route
            : null;

      if (notificationId) {
        handledRef.current.add(notificationId);
        // Optimistic mark-read locally then fire-and-forget to the server.
        dispatch({
          type: 'NOTIFICATIONS/MARK_READ',
          payload: { id: notificationId, readAt: new Date().toISOString() },
        });
        notificationsApi
          .markRead(notificationId)
          .catch((e) => logError(e, { where: 'notificationResponse.markRead' }));
      }

      if (actionRoute) {
        handleActionRoute(actionRoute);
      }
    });
    return () => {
      sub.remove();
    };
  }, [isAuthed, dispatch]);

  // Cold-start: surface the route from a notification that launched the app.
  useEffect(() => {
    if (!isAuthed || !state.initialized) return;
    let cancelled = false;
    void getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
        const actionRoute =
          typeof data.actionRoute === 'string'
            ? data.actionRoute
            : typeof data.route === 'string'
              ? data.route
              : null;
        if (actionRoute) {
          // Delay briefly to let the auth-redirect settle.
          setTimeout(() => handleActionRoute(actionRoute), 500);
        }
      })
      .catch((e) => logError(e, { where: 'getLastNotificationResponseAsync' }));
    return () => {
      cancelled = true;
    };
  }, [isAuthed, state.initialized]);

  // Sync iOS badge count to the unread mirror in WalletContext.
  useEffect(() => {
    const count = state.unreadNotificationsCount;
    if (count === null) return;
    void syncBadgeCount(count);
  }, [state.unreadNotificationsCount]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <ThemeProvider>
          <WalletProvider>
            <BottomSheetProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </BottomSheetProvider>
          </WalletProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
