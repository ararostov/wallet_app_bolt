export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  return `£${abs.toFixed(2)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - txDay.getTime()) / 86400000);

  if (diffDays === 0) return `Today · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Yesterday · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined });
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getTransactionIcon(type: string): string {
  switch (type) {
    case 'topup': return '💳';
    case 'purchase': return '🛒';
    case 'cashback': return '💰';
    case 'bonus': return '🎁';
    case 'refund': return '↩️';
    default: return '💸';
  }
}

export function getTxColor(type: string): string {
  switch (type) {
    case 'cashback': return '#059669';
    case 'bonus': return '#059669';
    case 'topup': return '#1a56db';
    case 'refund': return '#7c3aed';
    default: return '#64748b';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#059669';
    case 'pending': return '#d97706';
    case 'failed': return '#ef4444';
    case 'refunded': return '#7c3aed';
    default: return '#64748b';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'pending': return 'Pending';
    case 'failed': return 'Failed';
    case 'refunded': return 'Refunded';
    default: return status;
  }
}

export function groupTransactionsByDate(transactions: any[]): { date: string; items: any[] }[] {
  const groups: Record<string, any[]> = {};
  for (const tx of transactions) {
    const d = new Date(tx.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - txDay.getTime()) / 86400000);
    let key: string;
    if (diffDays === 0) key = 'Today';
    else if (diffDays === 1) key = 'Yesterday';
    else key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateShort(iso);
}
