import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, BookOpen, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: string[];
  onSuccess: () => void;
}

interface KEntry { id: string; title: string; file_name: string | null }

export const GenerateFromKnowledgeDialog = ({ open, onOpenChange, categories, onSuccess }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<KEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [entryId, setEntryId] = useState<string>("");
  const [category, setCategory] = useState<string>(categories[0] || "");
  const [titleHint, setTitleHint] = useState<string>("");

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from("knowledge_entries" as any)
      .select("id, title, file_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEntries((data as any) || []);
        setLoading(false);
      });
  }, [open, user?.id]);

  const handleGenerate = async () => {
    if (!user || !entryId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-from-knowledge", {
        body: { userId: user.id, knowledgeId: entryId, category, title: titleHint || undefined },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Artigo criado!", description: data.message || "Artigo gerado a partir da base." });
        onSuccess();
        onOpenChange(false);
        setEntryId(""); setTitleHint("");
      } else {
        toast({ title: "Falha", description: data?.error || "Erro desconhecido", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Criar Artigo a partir do Conhecimento
          </DialogTitle>
          <DialogDescription>
            A IA usará o material selecionado como fonte principal para escrever o artigo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Entrada da Base de Conhecimento</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma entrada. Adicione em Configurações → Conhecimento.
              </p>
            ) : (
              <Select value={entryId} onValueChange={setEntryId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma entrada" /></SelectTrigger>
                <SelectContent>
                  {entries.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}{e.file_name ? ` (${e.file_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título sugerido (opcional)</Label>
            <Input value={titleHint} onChange={(e) => setTitleHint(e.target.value)}
              placeholder="Deixe vazio para a IA decidir a partir do material" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !entryId} className="gradient-primary gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Gerando..." : "Gerar Artigo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
