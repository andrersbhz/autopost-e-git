import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Settings, PenTool, Image as ImageIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { UserSettings } from '@/pages/SettingsPage';
import { forwardRef } from 'react';
import ImageKnowledgeUpload from '@/components/settings/ImageKnowledgeUpload';

 import { useState, useMemo } from 'react';
 import { Plus, X, Users, Shuffle, ShieldCheck, Star } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const defaultCategories = [
  { id: 'esportes', label: '⚽ Esportes' },
  { id: 'politica', label: '🏛️ Política' },
  { id: 'policia', label: '🚔 Polícia' },
  { id: 'saude', label: '💚 Saúde e Bem-Estar' },
  { id: 'celebridades', label: '⭐ Celebridades' },
  { id: 'financas', label: '💰 Finanças' },
];

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
}

const AutomationSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange }, ref) => {
  const [newCategory, setNewCategory] = useState('');

  const availableCategories = useMemo(() => {
    // Current categories in settings + default ones not in settings
    const currentCategories = settings.categories.map(cat => {
      const def = defaultCategories.find(d => d.id === cat);
      return { id: cat, label: def ? def.label : cat };
    });
    
    return currentCategories;
  }, [settings.categories]);

  const toggleCategory = (catId: string) => {
    const newCategories = settings.categories.includes(catId)
      ? settings.categories.filter((c) => c !== catId)
      : [...settings.categories, catId];
    const newPriority = (settings.priority_categories || []).filter((c) => newCategories.includes(c));
    onChange({ categories: newCategories, priority_categories: newPriority });
  };

  const togglePriority = (catId: string) => {
    const current = settings.priority_categories || [];
    const newPriority = current.includes(catId)
      ? current.filter((c) => c !== catId)
      : [...current, catId];
    onChange({ priority_categories: newPriority });
  };

  const addCustomCategory = () => {
    const trimmed = newCategory.trim().toLowerCase();
    if (!trimmed) return;
    
    if (!settings.categories.includes(trimmed)) {
      onChange({ categories: [...settings.categories, trimmed] });
    }
    setNewCategory('');
  };

  const removeCategory = (catId: string) => {
    onChange({ categories: settings.categories.filter(c => c !== catId) });
  };

  return (
    <div ref={ref} className="space-y-6">
      {/* Modo de Imagem */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Imagem Destacada</CardTitle>
          </div>
          <CardDescription>
            Escolha como as imagens dos artigos serão gerenciadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.image_mode}
            onValueChange={(val: 'ai' | 'manual' | 'none') => onChange({ image_mode: val })}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <RadioGroupItem
                value="ai"
                id="mode-ai"
                className="peer sr-only"
              />
              <Label
                htmlFor="mode-ai"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <ImageIcon className="mb-3 h-6 w-6" />
                <span className="font-semibold">Gerada por IA</span>
                <span className="text-[10px] text-center text-muted-foreground mt-1">O robô gera uma imagem única para cada artigo</span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="manual"
                id="mode-manual"
                className="peer sr-only"
              />
              <Label
                htmlFor="mode-manual"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <PenTool className="mb-3 h-6 w-6" />
                <span className="font-semibold">Manual (Upload)</span>
                <span className="text-[10px] text-center text-muted-foreground mt-1">Você faz o upload da imagem após a geração</span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="none"
                id="mode-none"
                className="peer sr-only"
              />
              <Label
                htmlFor="mode-none"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="mb-3 h-6 w-6 flex items-center justify-center font-bold text-lg">/</div>
                <span className="font-semibold">Nenhuma</span>
                <span className="text-[10px] text-center text-muted-foreground mt-1">Os artigos serão criados sem imagem destacada</span>
              </Label>
            </div>
          </RadioGroup>

          {settings.image_mode === 'ai' && (
            <div className="mt-6 space-y-2">
              <Label htmlFor="image-format">Formato da imagem</Label>
              <Select
                value={settings.image_format || 'instagram_portrait'}
                onValueChange={(val) => onChange({ image_format: val })}
              >
                <SelectTrigger id="image-format">
                  <SelectValue placeholder="Selecione um formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram_square">📷 Instagram Feed Quadrado — 1080×1080 (1:1)</SelectItem>
                  <SelectItem value="instagram_portrait">📷 Instagram Feed Retrato — 1080×1350 (4:5)</SelectItem>
                  <SelectItem value="instagram_story">📱 Instagram Story/Reels — 1080×1920 (9:16)</SelectItem>
                  <SelectItem value="facebook_post">👍 Facebook Post — 1200×630 (1.91:1)</SelectItem>
                  <SelectItem value="facebook_square">👍 Facebook Quadrado — 1200×1200 (1:1)</SelectItem>
                  <SelectItem value="facebook_story">👍 Facebook Story — 1080×1920 (9:16)</SelectItem>
                  <SelectItem value="linkedin_post">💼 LinkedIn Post — 1200×627 (1.91:1)</SelectItem>
                  <SelectItem value="linkedin_square">💼 LinkedIn Quadrado — 1200×1200 (1:1)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O formato selecionado será usado pela IA ao gerar/regenerar imagens dos artigos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Writer Profile */}
      <Card className="shadow-card border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Perfil do Escritor (Obrigatório)</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">DINÂMICO & FORÇADO</Badge>
          </div>
          <CardDescription>
            Defina como a IA deve escrever seus artigos. Este prompt é o motor dinâmico do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="writer-prompt-settings">
            Prompt do escritor (texto)
          </Label>
          <Textarea
            id="writer-prompt-settings"
            value={settings.writer_prompt}
            onChange={(e) => onChange({ writer_prompt: e.target.value })}
            placeholder={`Ex: Sou um jornalista especializado em tecnologia. Escreva artigos com tom informal mas informativo, use listas e subtítulos, otimize para SEO...`}
            className="min-h-[200px] text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Dica: Inclua estilo de escrita, nicho, tom, público-alvo e técnicas de SEO.
          </p>
        </CardContent>
      </Card>

      {/* Image Prompt Profile */}
      <Card className="shadow-card border-l-4 border-l-accent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Prompt de Imagem IA (Obrigatório)</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">DINÂMICO & FORÇADO</Badge>
          </div>
          <CardDescription>
            Defina o estilo visual obrigatório para todas as imagens geradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="image-prompt-settings">
            Prompt para geração de imagens
          </Label>
          <Textarea
            id="image-prompt-settings"
            value={settings.image_prompt || ''}
            onChange={(e) => onChange({ image_prompt: e.target.value })}
            placeholder="Ex: Fotografia editorial realista, estilo fotojornalismo, iluminação natural, alta qualidade, 16:9..."
            className="min-h-[120px] text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Este prompt será usado em conjunto com o assunto do artigo para criar a imagem destacada.
          </p>

          <div className="pt-4 border-t border-border/60">
            <ImageKnowledgeUpload
              urls={settings.image_knowledge_urls || []}
              onChange={(urls) => onChange({ image_knowledge_urls: urls })}
            />
          </div>
        </CardContent>
      </Card>

       {/* Perfil de Interação */}
       <Card className="shadow-card">
         <CardHeader>
           <div className="flex items-center gap-2">
             <Users className="h-5 w-5 text-primary" />
             <CardTitle className="text-lg">Perfil de Interação</CardTitle>
           </div>
           <CardDescription>
             Defina como o robô deve interagir. O perfil selecionado será mantido até que você faça uma alteração.
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="interaction-mode">Modo de Interação</Label>
               <Select 
                 value={settings.interaction_mode || 'standard'} 
                 onValueChange={(val) => onChange({ interaction_mode: val })}
               >
                 <SelectTrigger id="interaction-mode">
                   <SelectValue placeholder="Selecione o modo" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="standard">
                     <div className="flex items-center gap-2">
                       <PenTool className="h-4 w-4" />
                       <span>Padrão (Escritor)</span>
                     </div>
                   </SelectItem>
                   <SelectItem value="journalist">
                     <div className="flex items-center gap-2">
                       <PenTool className="h-4 w-4" />
                       <span>Jornalístico</span>
                     </div>
                   </SelectItem>
                   <SelectItem value="creative">
                     <div className="flex items-center gap-2">
                       <PenTool className="h-4 w-4" />
                       <span>Criativo</span>
                     </div>
                   </SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="flex items-end pb-1">
               <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20 w-full">
                 <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                 <span className="text-[10px] text-muted-foreground leading-tight">
                   Perfil fixo selecionado. Suas alterações são salvas automaticamente e mantidas até a próxima alteração manual.
                 </span>
               </div>
             </div>
           </div>
         </CardContent>
       </Card>

       {/* Robô de Publicação */}
      <Card className={`shadow-card border-2 transition-all duration-300 ${settings.auto_publish ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className={`h-5 w-5 ${settings.auto_publish ? 'text-success' : 'text-destructive'}`} />
              <CardTitle className="text-lg">🤖 Robô de Publicação Automática</CardTitle>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border">
              <span className={`h-2 w-2 rounded-full animate-pulse ${settings.auto_publish ? 'bg-success' : 'bg-destructive'}`} />
              <span className={`text-[10px] font-bold uppercase ${settings.auto_publish ? 'text-success' : 'text-destructive'}`}>
                {settings.auto_publish ? 'Robô Ligado' : 'Robô Desligado'}
              </span>
            </div>
          </div>
          <CardDescription>
            Configure o comportamento do robô. Quando ligado, ele gera e publica conteúdo automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Postagens por dia */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Postagens por dia</Label>
            <p className="text-xs text-muted-foreground">
              Defina a quantidade de postagens a serem criadas e publicadas por dia. Os horários serão divididos em espaços iguais dentro de 24 horas.
            </p>
            <Input
              type="number"
              min={1}
              max={20}
              value={settings.articles_per_day}
              onChange={(e) => onChange({ articles_per_day: Math.max(1, Math.min(20, parseInt(e.target.value) || 3)) })}
            />
            {settings.articles_per_day > 0 && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                ⏰ Intervalo entre postagens: <strong>~{Math.round(24 / settings.articles_per_day * 60)} minutos</strong> ({(24 / settings.articles_per_day).toFixed(1)}h)
              </p>
            )}
          </div>

          {/* Publicação automática */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div>
              <p className="text-sm font-semibold text-foreground">Publicação automática no WordPress</p>
              <p className="text-xs text-muted-foreground">Quando ativado, os artigos gerados serão publicados automaticamente no horário agendado</p>
            </div>
            <Switch
              checked={settings.auto_publish}
              onCheckedChange={(checked) => onChange({ auto_publish: checked })}
            />
          </div>

          {/* Categorias */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Categorias ativas</Label>
              <p className="text-xs text-muted-foreground">O robô alternará entre estas categorias nas postagens automáticas</p>
            </div>

            {/* Gerenciamento de Categorias */}
            <div className="flex gap-2">
              <Input
                placeholder="Nova categoria (ex: Tecnologia)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
                className="text-sm"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={addCustomCategory}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {/* Categorias Padrão */}
              {defaultCategories.map((cat) => {
                const isActive = settings.categories.includes(cat.id);
                return (
                  <Badge
                    key={cat.id}
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1 text-xs transition-all ${
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {cat.label}
                  </Badge>
                );
              })}

              {/* Categorias Customizadas */}
              {settings.categories
                .filter(cat => !defaultCategories.find(d => d.id === cat))
                .map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="pl-3 pr-1 py-1 text-xs bg-accent/50 text-foreground group"
                  >
                    <span className="capitalize">{cat}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCategory(cat);
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>

            {/* Categorias Prioritárias */}
            {settings.categories.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <Label className="text-sm font-semibold">Categorias prioritárias</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Marque as categorias que devem ter <strong>prioridade</strong> na criação de artigos. As notícias dessas categorias serão escolhidas primeiro.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  {settings.categories.map((catId) => {
                    const def = defaultCategories.find(d => d.id === catId);
                    const label = def ? def.label : catId;
                    const isPriority = (settings.priority_categories || []).includes(catId);
                    return (
                      <label
                        key={catId}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-xs transition-all ${
                          isPriority
                            ? 'border-yellow-500/50 bg-yellow-500/10'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={isPriority}
                          onCheckedChange={() => togglePriority(catId)}
                        />
                        <span className="capitalize">{label}</span>
                        {isPriority && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {settings.categories.length === 0 && (
              <p className="text-xs text-destructive bg-destructive/5 p-2 rounded-md border border-destructive/10">
                ⚠️ Nenhuma categoria ativa. O robô não gerará postagens automáticas sem temas definidos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AutomationSettings.displayName = 'AutomationSettings';

export default AutomationSettings;
