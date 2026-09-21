import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface Model {
  id: string;
  name: string;
}

interface ModelSelectorProps {
  label: string;
  models: Model[];
  value: string;
  recommendedModel?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const AIModelSelector = ({
  label,
  models,
  value,
  recommendedModel,
  onChange,
  disabled
}: ModelSelectorProps) => {
  if (!models || models.length === 0) return null;

  return (
    <div className="space-y-1.5 mt-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <Sparkles className="h-3 w-3 text-[#a3ff12]" />
          Modelo Ativo ({label})
        </Label>
        {value && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#a3ff12]/30 text-[#a3ff12] uppercase font-bold">
            ATIVO
          </Badge>
        )}
      </div>
      
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 text-sm bg-background border-[#a3ff12]/20 hover:border-[#a3ff12]/40 transition-colors text-foreground">
          <SelectValue placeholder="Selecione um modelo..." />
        </SelectTrigger>
        <SelectContent className="bg-background border-border shadow-xl">
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-xs focus:bg-[#a3ff12]/10 focus:text-[#a3ff12] text-foreground">
              <div className="flex items-center justify-between w-full gap-2">
                <span>{model.name}</span>
                {model.id === recommendedModel && (
                  <Badge variant="secondary" className="text-[9px] bg-[#a3ff12]/10 text-[#a3ff12] border-[#a3ff12]/20 rounded-none px-1 py-0 uppercase">
                    Recomendado
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <p className="text-[10px] text-muted-foreground italic">
        * A lista de modelos é carregada dinamicamente da API do provedor.
      </p>
    </div>
  );
};
