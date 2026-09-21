import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Unplug, ExternalLink, Activity, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface ConnectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected: boolean;
  stayConnected?: boolean;
  onToggleStayConnected?: (checked: boolean) => void;
  onDisconnect?: () => void;
  onConnect?: () => void;
  onTest?: () => void;
  testing?: boolean;
  children?: React.ReactNode;
  connectedInfo?: string;
}

const ConnectionCard = forwardRef<HTMLDivElement, ConnectionCardProps>(({ 
  icon,
  title,
  description,
  connected,
  stayConnected = true,
  onToggleStayConnected,
  onDisconnect,
  onConnect,
  onTest,
  testing = false,
  children,
  connectedInfo,
}, ref) => {
  return (
    <Card ref={ref} className="shadow-card overflow-hidden">
      <div className={cn(
        'h-1',
        connected ? 'bg-success' : 'bg-destructive'
      )} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <div className={cn(
                  'h-2.5 w-2.5 rounded-full animate-pulse-dot',
                  connected ? 'bg-success' : 'bg-destructive'
                )} />
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onTest && (
              <Button
                size="sm"
                variant="outline"
                onClick={onTest}
                disabled={testing}
                className="h-8 text-[10px] font-bold uppercase tracking-widest"
                title="Testar conexão"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Activity className="h-3.5 w-3.5 mr-1.5" />
                )}
                Testar
              </Button>
            )}
            {!connected && onConnect && (
              <Button size="sm" onClick={onConnect} className="gradient-primary">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Conectar
              </Button>
            )}
          </div>
        </div>

        {connectedInfo && connected && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-3">
            {connectedInfo}
          </div>
        )}

        {children}

        {connected && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={stayConnected}
                onCheckedChange={(checked) => onToggleStayConnected?.(!!checked)}
              />
              <span className="text-xs text-muted-foreground">Manter conectado</span>
            </label>
            {onDisconnect && (
              <Button size="sm" variant="ghost" className="text-destructive text-xs h-7" onClick={onDisconnect}>
                <Unplug className="h-3.5 w-3.5 mr-1" />
                Desconectar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ConnectionCard.displayName = 'ConnectionCard';

export default ConnectionCard;

