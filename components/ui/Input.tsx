import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.focused,
          error ? styles.errorBorder : undefined,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : undefined, (rightIcon || isPassword) ? styles.inputWithRight : undefined, style]}
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.rightIcon}>
            {showPassword ? (
              <EyeOff size={18} color="#64748b" />
            ) : (
              <Eye size={18} color="#64748b" />
            )}
          </TouchableOpacity>
        )}
        {!isPassword && rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    minHeight: 52,
  },
  focused: { borderColor: '#2563eb', backgroundColor: '#fff' },
  errorBorder: { borderColor: '#ef4444' },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  inputWithLeft: { paddingLeft: 8 },
  inputWithRight: { paddingRight: 8 },
  leftIcon: { paddingLeft: 14 },
  rightIcon: { paddingRight: 14 },
  error: { fontSize: 12, color: '#ef4444', marginTop: 2 },
  hint: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
