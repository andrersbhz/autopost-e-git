// Shared date formatters for the news portal — consistent pt-BR display.

export const formatNewsDate = (date?: string | null): string => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export const formatNewsDateShort = (date?: string | null): string => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
};

export const formatRelative = (date?: string | null): string => {
  if (!date) return '';
  try {
    const diff = (Date.now() - new Date(date).getTime()) / 60000;
    if (diff < 1) return 'agora';
    if (diff < 60) return `há ${Math.round(diff)} min`;
    if (diff < 1440) return `há ${Math.round(diff / 60)} h`;
    if (diff < 10080) return `há ${Math.round(diff / 1440)} d`;
    return formatNewsDate(date);
  } catch {
    return '';
  }
};
