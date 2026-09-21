import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Trash2, BookOpen, FileText } from "lucide-react";

interface KnowledgeEntry {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  content: string;
  tags: string[];
  created_at: string;
}

const ACCEPTED = ".pdf,.txt,.md,application/pdf,text/plain,text/markdown";

export default function KnowledgeBaseSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_entries" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setEntries((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const readTextFile = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("Falha ao ler arquivo"));
      r.readAsText(f);
    });

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    if (!file && !description.trim()) {
      toast({ title: "Envie um arquivo ou preencha a descrição", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;
      let fileSize: number | null = null;
      let content = "";

      if (file) {
        fileName = file.name;
        fileType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "text/plain");
        fileSize = file.size;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("knowledge-files")
          .upload(path, file, { contentType: fileType, upsert: false });
        if (upErr) throw upErr;
        filePath = path;

        // Extract text client-side for txt/md; PDFs are read server-side at generation time
        if (fileType.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
          try { content = (await readTextFile(file)).slice(0, 200000); } catch { /* ignore */ }
        }
      }

      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      const { error: insertErr } = await supabase.from("knowledge_entries" as any).insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        content: content || description.trim() || "",
        tags,
      });
      if (insertErr) throw insertErr;

      toast({ title: "Salvo!", description: "Entrada adicionada à base de conhecimento." });
      setTitle(""); setDescription(""); setTagsInput(""); setFile(null);
      const fileInput = document.getElementById("kb-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      load();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    if (!confirm(`Excluir "${entry.title}"?`)) return;
    try {
      if (entry.file_path) {
        await supabase.storage.from("knowledge-files").remove([entry.file_path]);
      }
      const { error } = await supabase.from("knowledge_entries" as any).delete().eq("id", entry.id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast({ title: "Excluído" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Base de Conhecimento
          </CardTitle>
          <CardDescription>
            Adicione documentos (PDF, TXT, MD) e descrições. A IA usará este material como fonte
            ao criar artigos pela modalidade "Criar do Conhecimento".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Guia de Análise Técnica Forex" />
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                placeholder="forex, análise, iniciantes" />
            </div>
          </div>
          <div>
            <Label>Descrição / Anotações (opcional)</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Resumo do conteúdo ou pontos-chave que a IA deve considerar." />
          </div>
          <div>
            <Label htmlFor="kb-file">Arquivo (PDF, TXT, MD — até 20MB)</Label>
            <Input id="kb-file" type="file" accept={ACCEPTED}
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} • {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Adicionar à Base"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Entradas cadastradas ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma entrada ainda. Adicione arquivos ou anotações acima.
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background/40">
                  <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{e.title}</p>
                    {e.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{e.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {e.file_name && (
                        <Badge variant="outline" className="text-[10px]">{e.file_name}</Badge>
                      )}
                      {e.tags?.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(e)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
