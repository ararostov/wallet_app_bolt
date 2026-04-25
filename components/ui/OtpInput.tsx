// 6-cell (configurable length) OTP input with auto-advance, backspace,
// SMS autofill (iOS oneTimeCode / Android sms-otp), and paste support.
//
// onChange fires on every edit; onComplete fires when the user has entered
// every digit. The parent owns the value (string of length `length`).

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInput as TextInputType,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';

interface OtpInputProps {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  hasError?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = true,
  hasError = false,
  disabled = false,
}: OtpInputProps) {
  const { colors } = useTheme();
  const refs = useRef<Array<TextInputType | null>>([]);
  const lastReportedRef = useRef<string>('');

  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (value.length === length && lastReportedRef.current !== value) {
      lastReportedRef.current = value;
      onComplete?.(value);
    }
    if (value.length < length) {
      lastReportedRef.current = '';
    }
  }, [value, length, onComplete]);

  const handleChange = (text: string, index: number) => {
    if (disabled) return;
    const cleaned = text.replace(/\D/g, '');

    // Paste / SMS autofill: a single onChange call with the full code.
    if (cleaned.length > 1) {
      const next = cleaned.slice(0, length);
      onChange(next);
      const focusIdx = Math.min(next.length, length - 1);
      refs.current[focusIdx]?.focus();
      return;
    }

    const arr = digits.map((d) => (d === ' ' ? '' : d));
    arr[index] = cleaned.slice(-1);
    const next = arr.join('').slice(0, length);
    onChange(next);

    if (cleaned && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (disabled) return;
    if (e.nativeEvent.key !== 'Backspace') return;
    const cur = digits[index];
    if ((!cur || cur === ' ') && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="none"
      accessibilityLabel={`${length} digit verification code`}
    >
      {Array.from({ length }).map((_, i) => {
        const ch = digits[i];
        const filled = ch && ch !== ' ';
        return (
          <TextInput
            key={i}
            ref={(r) => {
              refs.current[i] = r;
            }}
            style={[
              styles.cell,
              {
                borderColor: hasError
                  ? colors.red
                  : filled
                    ? colors.primary
                    : colors.border,
                backgroundColor: filled ? colors.primaryLight : colors.background,
                color: colors.text,
              },
            ]}
            value={filled ? ch : ''}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={length}
            textAlign="center"
            autoFocus={autoFocus && i === 0}
            selectTextOnFocus
            editable={!disabled}
            textContentType={i === 0 ? 'oneTimeCode' : undefined}
            autoComplete={i === 0 ? 'sms-otp' : 'off'}
            accessibilityLabel={`Digit ${i + 1} of ${length}`}
            accessibilityHint="Enter a single digit"
            maxFontSizeMultiplier={1.5}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
});
