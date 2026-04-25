// Top-level React error boundary. Catches render-time errors and shows a
// minimal "Something went wrong" fallback with a reload button.

import React, { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { logError } from '@/utils/logger';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    logError(error, { componentStack: info.componentStack ?? undefined });
  }

  handleReload = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            We hit an unexpected problem. Please try again.
          </Text>
          <Pressable
            style={styles.button}
            onPress={this.handleReload}
            accessibilityRole="button"
            accessibilityLabel="Reload screen"
          >
            <Text style={styles.buttonText}>Reload</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1a56db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
