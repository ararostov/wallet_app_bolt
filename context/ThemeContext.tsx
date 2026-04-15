import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dark_mode';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  green: string;
  greenLight: string;
  amber: string;
  amberLight: string;
  red: string;
  redLight: string;
  iconBtnBg: string;
  shadowColor: string;
}

const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  primary: '#1a56db',
  primaryLight: '#eff6ff',
  green: '#059669',
  greenLight: '#f0fdf4',
  amber: '#d97706',
  amberLight: '#fffbeb',
  red: '#ef4444',
  redLight: '#fef2f2',
  iconBtnBg: '#ffffff',
  shadowColor: '#000000',
};

const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748b',
  border: '#334155',
  borderLight: '#1E293B',
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  green: '#34D399',
  greenLight: '#064E3B',
  amber: '#FBBF24',
  amberLight: '#78350F',
  red: '#F87171',
  redLight: '#7F1D1D',
  iconBtnBg: '#1E293B',
  shadowColor: '#000000',
};

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'true') setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'true' : 'false').catch(() => {});
      return next;
    });
  }, []);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
