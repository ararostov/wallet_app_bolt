// Tiny in-process emitter for cross-module auth signals.
// Used by api interceptor to notify WalletContext of forced logout
// without creating a circular dependency.

type AuthEventName = 'logout';
type Listener = () => void;

class AuthEventsImpl {
  private listeners: Map<AuthEventName, Set<Listener>> = new Map();

  on(event: AuthEventName, fn: Listener): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(fn);
    this.listeners.set(event, set);
    return () => {
      set.delete(fn);
    };
  }

  emit(event: AuthEventName): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      try {
        fn();
      } catch {
        // listeners must not throw across the bus
      }
    });
  }
}

export const AuthEvents = new AuthEventsImpl();
