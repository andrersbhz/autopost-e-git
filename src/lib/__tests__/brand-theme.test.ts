import { describe, expect, it } from 'vitest';
import { contrastForeground, normalizeBrandTheme } from '@/lib/brand-theme';

describe('brand theme contrast', () => {
  it('uses dark foreground on bright configurable colors', () => {
    expect(contrastForeground('#a3ff12')).toBe('222 47% 9%');
    expect(contrastForeground('#ffffff')).toBe('222 47% 9%');
  });

  it('uses light foreground on dark configurable colors', () => {
    expect(contrastForeground('#050505')).toBe('0 0% 100%');
    expect(contrastForeground('#000000')).toBe('0 0% 100%');
  });

  it('always provides independent normal and hover button colors', () => {
    const theme = normalizeBrandTheme(null);
    expect(theme.primary_button_bg).not.toBe(theme.primary_button_text);
    expect(theme.primary_button_hover_bg).not.toBe(theme.primary_button_hover_text);
    expect(theme.secondary_button_bg).not.toBe(theme.secondary_button_text);
    expect(theme.secondary_button_hover_bg).not.toBe(theme.secondary_button_hover_text);
  });
});
