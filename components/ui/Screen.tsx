import React from 'react';
import { ScrollView, View, StyleSheet, ViewStyle, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  backgroundColor?: string;
  keyboardAvoiding?: boolean;
}

export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
  backgroundColor = '#f8fafc',
  keyboardAvoiding = false,
}: ScreenProps) {
  const inner = scroll ? (
    <ScrollView
      style={[styles.scroll, { backgroundColor }]}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, { backgroundColor }, contentStyle]}>{children}</View>
  );

  if (keyboardAvoiding) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor }, style]}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {inner}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }, style]}>{inner}</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
});
