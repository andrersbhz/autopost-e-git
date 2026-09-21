import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon, Crop, Sparkles, Film, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isVideoUrl } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/image-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface ImageUploadProps {
  articleId: string;
  currentImageUrl?: string;
  currentThumbnailUrl?: string;
  onUploadSuccess: (url: string) => void;
  onThumbnailChange?: (url: string) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AspectKey = 'original' | 'square' | 'portrait45' | 'landscape' | 'story';
const ASPECT_OPTIONS: Record<AspectKey, { label: string; ratio: number | null; w: number; h: number }> = {
  original:    { label: 'Original', ratio: null,    w: 1920, h: 0 },
  square:      { label: '1:1',      ratio: 1,       w: 1080, h: 1080 },
  portrait45:  { label: '4:5',      ratio: 4 / 5,   w: 1080, h: 1350 },
  landscape:   { label: '16:9',     ratio: 16 / 9,  w: 1920, h: 1080 },
  story:       { label: '9:16',     ratio: 9 / 16,  w: 1080, h: 1920 },
};

// Resize an image (from data URL or URL) to a max width, keeping aspect ratio.
async function resizeToMaxWidth(src: string, maxWidth: number, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return reject(new Error('canvas ctx'));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), mime, quality);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export const ImageUpload = ({ articleId, currentImageUrl, currentThumbnailUrl, onUploadSuccess, onThumbnailChange }: ImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(currentThumbnailUrl || null);

  // Link-by-URL dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkType, setLinkType] = useState<'image' | 'video'>('image');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkThumbUrl, setLinkThumbUrl] = useState('');

  // Aspect ratio selection (drives crop + preview container) - persisted as default
  const ASPECT_STORAGE_KEY = 'imageUpload.aspectKey';
  const [aspectKey, setAspectKeyState] = useState<AspectKey>(() => {
    if (typeof window === 'undefined') return 'portrait45';
    const saved = window.localStorage.getItem(ASPECT_STORAGE_KEY) as AspectKey | null;
    return saved && saved in ASPECT_OPTIONS ? saved : 'portrait45';
  });
  const setAspectKey = (k: AspectKey) => {
    setAspectKeyState(k);
    try { window.localStorage.setItem(ASPECT_STORAGE_KEY, k); } catch { /* ignore */ }
  };
  const currentAspect = ASPECT_OPTIONS[aspectKey];

  // Cropping states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp'>('image/webp');
  const [quality, setQuality] = useState(0.85);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', async () => {
      const dataUrl = reader.result as string;
      // Original: skip crop, resize to max 1920 width and upload directly.
      if (currentAspect.ratio === null) {
        await handleOriginalUpload(dataUrl);
      } else {
        setSelectedImage(dataUrl);
        setIsCropDialogOpen(true);
      }
    });
    reader.readAsDataURL(file);
  };

  const handleOriginalUpload = async (sourceUrl: string) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const blob = await resizeToMaxWidth(sourceUrl, 1920, format, quality);
      if (!blob) throw new Error('Falha ao processar imagem');
      const ext = format === 'image/webp' ? 'webp' : 'jpg';
      const filePath = `${user.id}/${articleId}/${Math.random()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, blob, { contentType: format, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(filePath);
      if (articleId && UUID_RE.test(articleId)) {
        const { error: updateError } = await supabase.from('articles').update({ featured_image_url: publicUrl }).eq('id', articleId);
        if (updateError) throw updateError;
      }
      setPreviewUrl(publicUrl);
      onUploadSuccess(publicUrl);
      window.dispatchEvent(new CustomEvent('article-image-uploaded', { detail: { articleId, url: publicUrl } }));
      toast({ title: 'Sucesso', description: 'Imagem enviada em tamanho original (máx 1920px).' });
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };


  const handleUpload = async (imageToUpload?: string, areaPixels?: any) => {
    const sourceImage = imageToUpload || selectedImage;
    const pixels = areaPixels || croppedAreaPixels;
    
    if (!sourceImage || !pixels) return;

    try {
      setUploading(true);
      setIsCropDialogOpen(false);

      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para fazer upload.",
          variant: "destructive",
        });
        return;
      }

      // Export at the resolution of the currently selected aspect
      const targetW = currentAspect.w;
      const targetH = currentAspect.h || undefined;
      const croppedImageBlob = await getCroppedImg(
        sourceImage,
        pixels,
        0,
        { horizontal: false, vertical: false },
        targetW,
        0.15,
        format,
        quality,
        targetH
      );
      if (!croppedImageBlob) throw new Error("Erro ao processar imagem");

      const fileExt = format === 'image/webp' ? 'webp' : 'jpg';
      const filePath = `${user.id}/${articleId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, croppedImageBlob, {
          contentType: format,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('articles')
        .update({ featured_image_url: publicUrl })
        .eq('id', articleId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onUploadSuccess(publicUrl);

      window.dispatchEvent(new CustomEvent('article-image-uploaded', { 
        detail: { articleId, url: publicUrl } 
      }));
      
      setSelectedImage(null);
      setCroppedAreaPixels(null);

      toast({
        title: 'Sucesso',
        description: `Imagem enviada (${currentAspect.w}${currentAspect.h ? 'x' + currentAspect.h : 'px'}).`,
      });
      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Erro no processamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const processAndUploadAIImage = async (url: string) => {
    try {
      setUploading(true);

      // Original mode: keep AI image as-is (no crop, no resize).
      if (currentAspect.ratio === null) {
        setPreviewUrl(url);
        onUploadSuccess(url);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      // Auto-crop to selected aspect
      const targetAspect = currentAspect.ratio;
      const imgAspect = img.width / img.height;
      let cropWidth, cropHeight, cropX, cropY;
      if (imgAspect > targetAspect) {
        cropHeight = img.height;
        cropWidth = img.height * targetAspect;
        cropX = (img.width - cropWidth) / 2;
        cropY = 0;
      } else {
        cropWidth = img.width;
        cropHeight = img.width / targetAspect;
        cropX = 0;
        cropY = (img.height - cropHeight) / 2;
      }

      const autoPixels = {
        x: Math.round(cropX),
        y: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      };

      await handleUpload(url, autoPixels);
    } catch (e) {
      console.error('Error auto-processing AI image:', e);
      setPreviewUrl(url);
      onUploadSuccess(url);
    } finally {
      setUploading(false);
    }
  };


  const handleGenerateAI = async () => {
    if (!user || !articleId) return;
    try {
      setUploading(true);
      const { data, error } = await supabase.functions.invoke('regenerate-image', {
        body: { userId: user.id, articleIds: [articleId], force: true },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        const generatedUrl = data.imageUrl;
        if (generatedUrl) {
          await processAndUploadAIImage(generatedUrl);
        } else {
          toast({ 
            title: "Gerando imagem...", 
            description: "Aguarde enquanto criamos sua imagem com IA." 
          });
          
          // Fallback polling
          let attempts = 0;
          const interval = setInterval(async () => {
            attempts++;
            const { data: updated } = await supabase
              .from('articles')
              .select('featured_image_url')
              .eq('id', articleId)
              .single();
              
            if (updated?.featured_image_url || attempts > 10) {
              clearInterval(interval);
              if (updated?.featured_image_url) {
                await processAndUploadAIImage(updated.featured_image_url);
              }
            }
          }, 4000);
        }
      } else {
        toast({ title: "Erro", description: data?.message || "Não foi possível gerar a imagem.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro na geração", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploading(true);
      const { error } = await supabase
        .from('articles')
        .update({ featured_image_url: null })
        .eq('id', articleId);

      if (error) throw error;

      setPreviewUrl(null);
      onUploadSuccess('');
      toast({
        title: "Sucesso",
        description: "Imagem removida com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);

      // Validate dimensions ~ 4:5 (1080x1350)
      const url = URL.createObjectURL(file);
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => resolve({ w: v.videoWidth, h: v.videoHeight });
        v.onerror = () => reject(new Error('Não foi possível ler o vídeo'));
        v.src = url;
      });
      URL.revokeObjectURL(url);

      const ratio = dims.w / dims.h;
      const target = 1080 / 1350;
      const tolerance = 0.03;
      if (Math.abs(ratio - target) > tolerance) {
        toast({
          title: 'Formato inválido',
          description: `O vídeo deve ser 1080x1350 (4:5). Detectado: ${dims.w}x${dims.h}.`,
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }

      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const filePath = `${user.id}/${articleId}/${Math.random()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, file, { contentType: file.type || 'video/mp4', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('articles')
        .update({ featured_image_url: publicUrl })
        .eq('id', articleId);
      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onUploadSuccess(publicUrl);
      window.dispatchEvent(new CustomEvent('article-image-uploaded', {
        detail: { articleId, url: publicUrl }
      }));

      toast({ title: 'Sucesso', description: 'Vídeo (1080x1350) enviado!' });
    } catch (e: any) {
      toast({ title: 'Erro no upload do vídeo', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const persistMedia = async (mediaUrl: string, thumb?: string | null) => {
    if (articleId && UUID_RE.test(articleId)) {
      const patch: Record<string, any> = { featured_image_url: mediaUrl };
      if (thumb !== undefined) patch.video_thumbnail_url = thumb || null;
      const { error } = await supabase.from('articles').update(patch).eq('id', articleId);
      if (error) throw error;
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) {
      toast({ title: 'URL obrigatória', description: 'Informe o link da mídia.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const url = linkUrl.trim();
      const isVid = linkType === 'video' || isVideoUrl(url);

      if (isVid && !linkThumbUrl.trim()) {
        toast({ title: 'Thumbnail obrigatória', description: 'Para vídeo, informe a URL da capa (thumbnail).', variant: 'destructive' });
        setUploading(false);
        return;
      }

      const thumb = isVid ? linkThumbUrl.trim() : null;
      await persistMedia(url, thumb);

      setPreviewUrl(url);
      setThumbnailUrl(thumb);
      onUploadSuccess(url);
      onThumbnailChange?.(thumb || '');

      window.dispatchEvent(new CustomEvent('article-image-uploaded', {
        detail: { articleId, url }
      }));

      toast({ title: 'Mídia vinculada', description: isVid ? 'Vídeo + thumbnail salvos.' : 'Imagem vinculada com sucesso.' });
      setIsLinkDialogOpen(false);
      setLinkUrl('');
      setLinkThumbUrl('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailUrlChange = async (val: string) => {
    setThumbnailUrl(val || null);
    try {
      if (articleId && UUID_RE.test(articleId)) {
        const { error } = await supabase.from('articles')
          .update({ video_thumbnail_url: val || null })
          .eq('id', articleId);
        if (error) throw error;
      }
      onThumbnailChange?.(val);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar thumbnail', description: e.message, variant: 'destructive' });
    }
  };

  const isPreviewVideo = !!previewUrl && isVideoUrl(previewUrl);

  return (
    <div className="space-y-4">
      {/* Aspect ratio selector */}
      <div className="flex flex-col gap-2 p-3 bg-muted/20 border border-primary/10 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Formato da Imagem</span>
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {currentAspect.label}{currentAspect.ratio === null ? ' (máx 1920px)' : ` · ${currentAspect.w}x${currentAspect.h}`}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {(Object.keys(ASPECT_OPTIONS) as AspectKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setAspectKey(k)}
              className={cn(
                'text-[10px] font-bold py-1.5 rounded transition-all border',
                aspectKey === k
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40'
              )}
            >
              {ASPECT_OPTIONS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'relative w-full max-w-full mx-auto rounded-none border-2 border-dashed border-border overflow-hidden bg-muted/30 flex items-center justify-center',
          previewUrl ? '' : ''
        )}
        style={
          previewUrl
            ? undefined
            : { aspectRatio: currentAspect.ratio ? String(currentAspect.ratio) : '4 / 5' }
        }
      >
        {previewUrl ? (
          <>
            {isPreviewVideo ? (
              <video
                src={previewUrl}
                poster={thumbnailUrl || undefined}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto object-contain block max-h-[70vh]"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto object-contain block max-h-[70vh]"
              />
            )}
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background text-destructive transition-colors"
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-20" />
            <p className="text-xs">Nenhuma mídia selecionada</p>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="relative overflow-hidden w-full gap-2"
          disabled={uploading}
        >
          <Upload className="h-4 w-4" />
          Imagem
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="relative overflow-hidden w-full gap-2 border-primary/30"
          disabled={uploading}
        >
          <Film className="h-4 w-4" />
          Vídeo
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleVideoSelect}
            disabled={uploading}
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
          onClick={handleGenerateAI}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          IA
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-primary/30"
          onClick={() => { setLinkType('image'); setIsLinkDialogOpen(true); }}
          disabled={uploading}
        >
          <LinkIcon className="h-4 w-4" />
          Link
        </Button>
      </div>

      {isPreviewVideo && (
        <div className="space-y-1.5 p-3 bg-muted/20 border border-primary/10 rounded-lg">
          <Label htmlFor="video-thumb" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Thumbnail do Vídeo (capa)
          </Label>
          <Input
            id="video-thumb"
            type="url"
            placeholder="https://.../thumb.jpg (1080x1350)"
            value={thumbnailUrl || ''}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            onBlur={(e) => handleThumbnailUrlChange(e.target.value)}
            className="text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            Usada como capa estática (poster) do vídeo nas redes e prévias.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2 p-3 bg-muted/20 border border-primary/10 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Configurações de Exportação</span>
          <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {format === 'image/webp' ? 'WEBP' : 'JPG'} @ {Math.round(quality * 100)}%
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground">Formato</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setFormat('image/webp')}
                className={cn(
                  "flex-1 text-[9px] font-bold py-1 rounded transition-all",
                  format === 'image/webp' ? "bg-primary text-white shadow-sm" : "bg-background text-muted-foreground border border-border hover:border-primary/30"
                )}
              >
                WEBP
              </button>
              <button 
                onClick={() => setFormat('image/jpeg')}
                className={cn(
                  "flex-1 text-[9px] font-bold py-1 rounded transition-all",
                  format === 'image/jpeg' ? "bg-primary text-white shadow-sm" : "bg-background text-muted-foreground border border-border hover:border-primary/30"
                )}
              >
                JPG
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground">Qualidade</span>
            <Slider
              value={[quality * 100]}
              min={10}
              max={100}
              step={1}
              onValueChange={(value) => setQuality(value[0] / 100)}
              className="w-full h-4"
            />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center italic">
        Escolha um formato antes de enviar. "Original" mantém o tamanho real (máx 1920px de largura).
      </p>


      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border-primary/20">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Ajustar Imagem ({currentAspect.label})</DialogTitle>
              <div className="flex flex-wrap gap-2 mr-6">
                <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  {currentAspect.w}x{currentAspect.h}
                </span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 relative w-full h-[400px] bg-black rounded-md overflow-hidden border border-primary/10">
                {selectedImage && (
                  <Cropper
                    image={selectedImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={currentAspect.ratio || 1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onMediaLoaded={(mediaSize) => setImageSize(mediaSize)}
                  />
                )}
              </div>
              
              <div className="hidden md:flex flex-col gap-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização</h4>
                <div
                  className="relative border border-primary/20 rounded-md overflow-hidden bg-muted/20 w-full max-w-[150px] mx-auto transition-all"
                  style={{ aspectRatio: String(currentAspect.ratio || 1) }}
                >
                  {selectedImage && croppedAreaPixels && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${selectedImage})`,
                        backgroundSize: `${(imageSize.width / (croppedAreaPixels.width || 1)) * 100}% ${(imageSize.height / (croppedAreaPixels.height || 1)) * 100}%`,
                        backgroundPosition: `${(croppedAreaPixels.x / (Math.max(1, imageSize.width - croppedAreaPixels.width))) * 100}% ${(croppedAreaPixels.y / (Math.max(1, imageSize.height - croppedAreaPixels.height))) * 100}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  )}
                </div>
                <p className="text-[10px] text-center text-muted-foreground leading-tight">
                  Como a imagem será exibida após o corte.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Zoom</span>
                  <span className="font-medium">{Math.round(zoom * 100)}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={(value) => setZoom(value[0])}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Qualidade ({format === 'image/webp' ? 'WebP' : 'JPG'})</span>
                  <span className="font-medium">{Math.round(quality * 100)}%</span>
                </div>
                <Slider
                  value={[quality * 100]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={(value) => setQuality(value[0] / 100)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 border-t border-primary/10 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formato:</span>
              <div className="flex gap-2">
                <Button 
                  variant={format === 'image/webp' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setFormat('image/webp')}
                  className="h-7 text-[10px] px-3"
                >
                  WEBP (Leve)
                </Button>
                <Button 
                  variant={format === 'image/jpeg' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setFormat('image/jpeg')}
                  className="h-7 text-[10px] px-3"
                >
                  JPG (Compatível)
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsCropDialogOpen(false);
                setSelectedImage(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => handleUpload()} className="gap-2">
              <Crop className="h-4 w-4" />
              Cortar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              Vincular mídia por link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLinkType('image')}
                className={cn(
                  "text-xs font-bold py-2 rounded transition-all border",
                  linkType === 'image' ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <ImageIcon className="h-3 w-3 inline mr-1" /> Imagem
              </button>
              <button
                onClick={() => setLinkType('video')}
                className={cn(
                  "text-xs font-bold py-2 rounded transition-all border",
                  linkType === 'video' ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <Film className="h-3 w-3 inline mr-1" /> Vídeo
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="link-url" className="text-xs">
                URL da {linkType === 'video' ? 'mídia (vídeo)' : 'imagem'}
              </Label>
              <Input
                id="link-url"
                type="url"
                placeholder={linkType === 'video' ? 'https://.../video.mp4' : 'https://.../image.jpg'}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Recomendado: formato 1080x1350 (4:5).</p>
            </div>

            {linkType === 'video' && (
              <div className="space-y-1.5">
                <Label htmlFor="link-thumb" className="text-xs">URL da Thumbnail (obrigatória)</Label>
                <Input
                  id="link-thumb"
                  type="url"
                  placeholder="https://.../thumb.jpg"
                  value={linkThumbUrl}
                  onChange={(e) => setLinkThumbUrl(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Capa estática exibida antes do play e usada nas publicações.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleLinkSubmit} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
