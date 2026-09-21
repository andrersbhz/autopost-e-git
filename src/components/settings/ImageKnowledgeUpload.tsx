import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

const BUCKET = 'article-images';
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface Props {
  urls: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageKnowledgeUpload({ urls, onChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const remaining = MAX_IMAGES - urls.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of list) {
        if (!file.type.startsWith('image/')) {
          toast({ title: 'Arquivo inválido', description: `${file.name} não é uma imagem.`, variant: 'destructive' });
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast({ title: 'Muito grande', description: `${file.name} excede 5MB.`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/knowledge/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
        if (error) {
          toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      if (newUrls.length) onChange([...urls, ...newUrls]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = async (index: number) => {
    const url = urls[index];
    // Try to remove from storage (best-effort)
    try {
      const marker = `/${BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx >= 0) {
        const path = url.substring(idx + marker.length);
        await supabase.storage.from(BUCKET).remove([path]);
      }
    } catch { /* ignore */ }
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ImageIcon className="h-4 w-4 text-accent" />
          Conhecimento visual ({urls.length}/{MAX_IMAGES})
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || remaining <= 0}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Enviar imagens
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Envie até {MAX_IMAGES} imagens de referência. A IA analisará esses modelos visuais e se inspirará neles ao gerar novas artes, sempre em conjunto com o Prompt de Imagem.
      </p>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {urls.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-md overflow-hidden border border-border">
              <img src={url} alt={`Referência ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                aria-label="Remover imagem"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
