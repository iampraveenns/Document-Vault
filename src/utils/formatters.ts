export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 30) return 'just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;

    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

export function getExtensionMeta(extension: string) {
  const ext = extension.toLowerCase();
  switch (ext) {
    case '.json':
      return {
        label: 'JSON',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        iconColor: 'text-amber-600',
      };
    case '.md':
      return {
        label: 'MARKDOWN',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        iconColor: 'text-sky-600',
      };
    case '.txt':
    default:
      return {
        label: 'TEXT',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconColor: 'text-emerald-600',
      };
  }
}
