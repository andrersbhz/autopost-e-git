import { useEffect, useState } from 'react';
import { Palette, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/theme-provider';

const COLOR_FIELDS = [
  { key: 'background', label: 'Fundo geral', help: 'Cor principal do fundo do sistema.' },
  { key: 'surface', label: 'Cards e painéis', help: 'Cor de cards, modais e superfícies elevadas.' },
  { key: 'surfaceAlt', label: 'Superfície secundária', help: 'Fundos auxiliares, áreas muted e estados secundários.' },
  { key: 'border', label: 'Bordas e campos', help: 'Bordas de cards, inputs e divisores.' },
  { key: 'primary', label: 'Cor principal', help: 'Botões principais, destaques e foco.' },
  { key: 'accent', label: 'Cor de destaque', help: 'Ações secundárias e elementos de destaque.' },
  { key: 'textPrimary', label: 'Fonte principal', help: 'Títulos, textos principais e conteúdo.' },
  { key: 'textMuted', label: 'Fonte secundária', help: 'Descrições, legendas e textos de apoio.' },
  { key: 'textOnPrimary', label: 'Fonte sobre botão principal', help: 'Texto exibido sobre a cor principal.' },
  { key: 'textOnAccent', label: 'Fonte sobre destaque', help: 'Texto exibido sobre a cor de destaque.' },
  { key: 'sidebarBackground', label: 'Fundo do menu lateral', help: 'Cor de fundo da navegação lateral.' },
  { key: 'sidebarText', label: 'Fonte do menu lateral', help: 'Cor dos textos e ícones da navegação.' },
] as const;

const AppearancePaletteSettings = () => {
  const { systemColors, setSystemColors } = useTheme();
  const [draft, setDraft] = useState(systemColors);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(systemColors);
  }, [systemColors]);

  const handleColorChange = (key: keyof typeof draft, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleApply = () => {
    setSystemColors(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Palette className="h-4 w-4 text-primary" /> Paleta do sistema
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Edite toda a identidade visual do sistema sem alterar nenhuma função.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Editor de identidade visual</p>
              <p className="text-xs text-muted-foreground">
                Não existem mais paletas predefinidas. Todas as cores abaixo podem ser configuradas manualmente.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3">
                <div>
                  <Label>{field.label}</Label>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{field.help}</p>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                  <input
                    type="color"
                    value={draft[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0"
                    aria-label={field.label}
                  />
                  <input
                    type="text"
                    value={draft[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-xs font-mono uppercase text-foreground outline-none"
                    aria-label={`${field.label} em hexadecimal`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">
              As alterações ficam salvas neste navegador e permanecem após atualizar ou entrar novamente no sistema.
            </p>
            <Button onClick={handleApply} className="min-w-36">
              {saved ? 'Cores aplicadas' : 'Aplicar cores'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearancePaletteSettings;
