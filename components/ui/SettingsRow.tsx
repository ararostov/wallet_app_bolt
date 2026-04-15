import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface SettingsRowProps {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  showChevron?: boolean;
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  destructive = false,
  showChevron = true,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.content}>
        <Text style={[styles.label, destructive && styles.destructiveLabel]}>{label}</Text>
      </View>
      {value && <Text style={styles.value}>{value}</Text>}
      {rightElement ?? (showChevron && onPress && (
        <ChevronRight size={16} color="#94a3b8" />
      ))}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  destructiveLabel: {
    color: '#ef4444',
  },
  value: {
    fontSize: 14,
    color: '#64748b',
  },
});
