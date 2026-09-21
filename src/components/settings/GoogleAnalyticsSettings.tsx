import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3 } from 'lucide-react';
import ConnectionCard from '@/components/ConnectionCard';
import type { UserSettings } from '@/pages/SettingsPage';
import { forwardRef } from 'react';

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
}

const GoogleAnalyticsSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange }, ref) => {
  const connected = !!settings.google_analytics_property_id;

  return (
    <ConnectionCard
      ref={ref}
      icon={<BarChart3 className="h-5 w-5 text-primary" />}
      title="Google Analytics"
      description="Métricas e insights do seu blog"
      connected={connected}
      connectedInfo={connected ? `Property: ${settings.google_analytics_property_id}` : undefined}
      onDisconnect={() => onChange({ google_analytics_property_id: '' })}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Property ID (GA4)</Label>
          <Input
            placeholder="123456789"
            value={settings.google_analytics_property_id}
            onChange={(e) => onChange({ google_analytics_property_id: e.target.value })}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Encontre em: Google Analytics → Admin → Propriedade → Detalhes da propriedade
          </p>
        </div>
      </div>
    </ConnectionCard>
  );
});

GoogleAnalyticsSettings.displayName = 'GoogleAnalyticsSettings';

export default GoogleAnalyticsSettings;
