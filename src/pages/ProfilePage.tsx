import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { maskPhoneBR, isValidPhoneBR, onlyDigits } from '@/lib/masks';

const AVATAR_BUCKET = 'article-images';

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        toast({ title: 'Erro ao carregar perfil', description: error.message, variant: 'destructive' });
      }
      setFullName(data?.full_name ?? '');
      setEmail(data?.email ?? user.email ?? '');
      const raw = onlyDigits(data?.whatsapp ?? '');
      // Strip leading BR country code (55) if the stored value looks like E.164 12-13 digits.
      const normalized = (raw.length === 12 || raw.length === 13) && raw.startsWith('55') ? raw.slice(2) : raw;
      setWhatsapp(normalized ? maskPhoneBR(normalized) : '');
      setAvatarUrl(data?.avatar_url ?? null);
      setLoading(false);
    })();
  }, [user, toast]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
      toast({ title: 'Foto carregada', description: 'Lembre-se de salvar para confirmar.' });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar foto', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast({ title: 'Nome é obrigatório', variant: 'destructive' });
    if (!email.trim()) return toast({ title: 'E-mail é obrigatório', variant: 'destructive' });
    if (whatsapp.trim() && !isValidPhoneBR(whatsapp)) {
      return toast({ title: 'WhatsApp inválido', description: 'Use DDD + número (10 ou 11 dígitos)', variant: 'destructive' });
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim() ? onlyDigits(whatsapp) : null,
        avatar_url: avatarUrl,
      };
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;

      if (email && email !== user.email) {
        const { error: authErr } = await supabase.auth.updateUser({ email });
        if (authErr) {
          toast({
            title: 'E-mail no perfil salvo',
            description: `Não foi possível atualizar o e-mail de login: ${authErr.message}`,
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Confirme seu novo e-mail', description: 'Enviamos um link de confirmação para o novo endereço.' });
        }
      }

      toast({ title: 'Perfil atualizado' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (fullName || email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold">Meu Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Foto</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName || 'avatar'} /> : null}
            <AvatarFallback className="text-2xl">{initials || <UserIcon />}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarUpload(f);
                e.target.value = '';
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="outline">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Enviando...' : 'Carregar nova foto'}
            </Button>
            {avatarUrl && (
              <Button variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>
                Remover foto
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome *</Label>
            <Input id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(maskPhoneBR(e.target.value))} placeholder="(11) 99999-9999" maxLength={16} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
