import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Instagram, Plus, Trash2, Loader2, Key, User, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ConnectionCard from '@/components/ConnectionCard';
import { cn } from '@/lib/utils';

interface InstagramAccountDirect {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

const InstagramDirectSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<InstagramAccountDirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ username: '', password: '' });
  const [saving, setSaving] = useState(false);

  const fetchAccounts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('instagram_accounts_direct')
        .select('id, username, is_active, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setAccounts((data as any[]) || []);
    } catch (e: any) {
      console.error("Error fetching instagram accounts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const handleAdd = async () => {
    if (!user || !newAccount.username || !newAccount.password) {
      toast({ title: 'Erro', description: 'Usuário e senha são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('instagram_accounts_direct').insert({
        user_id: user.id,
        username: newAccount.username,
        password: newAccount.password,
        is_active: true
      } as any);
      
      if (error) throw error;
      
      toast({ title: 'Conta adicionada!', description: 'Conexão direta configurada com sucesso.' });
      setNewAccount({ username: '', password: '' });
      setShowAdd(false);
      fetchAccounts();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('instagram_accounts_direct').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Conta removida' });
      fetchAccounts();
    } catch (e: any) {
      toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' });
    }
  };

  const connected = accounts.length > 0;

  return (
    <ConnectionCard
      icon={<Instagram className="h-5 w-5 text-[#E4405F]" />}
      title="Instagram (Conexão Direta)"
      description="Gerencie postagens via login e senha"
      connected={connected}
      connectedInfo={connected ? `${accounts.length} conta(s) configurada(s)` : undefined}
      onTest={connected ? async () => {
        const active = accounts.filter(a => a.is_active);
        if (active.length === 0) {
          toast({ title: '⚠️ Nenhuma conta ativa', description: 'Adicione ou ative ao menos uma conta.', variant: 'destructive' });
          return;
        }
        toast({
          title: '✅ Credenciais armazenadas',
          description: `${active.length} conta(s) ativa(s): ${active.map(a => '@' + a.username).join(', ')}`,
        });
      } : undefined}
      onConnect={!connected ? () => setShowAdd(true) : undefined}
      onDisconnect={connected ? async () => {
        if (confirm('Tem certeza que deseja remover todas as conexões diretas do Instagram?')) {
          const { error } = await supabase.from('instagram_accounts_direct').delete().eq('user_id', user?.id);
          if (!error) {
            toast({ title: 'Desconectado', description: 'Todas as contas foram removidas.' });
            fetchAccounts();
          }
        }
      } : undefined}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-yellow-500">Não suportamos 2FA na conexão direta.</p>
            <p>
              Se sua conta tem autenticação de dois fatores ativa, o login direto irá falhar. Para contas com 2FA, use a <strong>conexão oficial via Facebook (Graph API)</strong> na seção "Facebook" acima — o Instagram Business vinculado à sua página é detectado automaticamente e o Meta cuida do 2FA por você.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center">
                    <Instagram className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">@{acc.username}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status: {acc.is_active ? 'Ativo' : 'Inativo'}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0" onClick={() => handleDelete(acc.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {showAdd ? (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold uppercase tracking-tight">Nova Conta Instagram</span>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Usuário / Email</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="seu_usuario"
                        value={newAccount.username}
                        onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                        className="pl-9 bg-background/50 border-white/10 h-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Senha</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
                      <PasswordInput
                        placeholder="••••••••"
                        value={newAccount.password}
                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                        className="pl-9 bg-background/50 border-white/10 h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleAdd} disabled={saving} className="gradient-primary flex-1 font-bold uppercase text-[10px] tracking-widest">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                    Confirmar Conta
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="px-4 text-[10px] font-bold uppercase tracking-widest">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 h-12 text-[10px] font-black uppercase tracking-widest"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nova Conta
              </Button>
            )}
          </div>
        )}
      </div>
    </ConnectionCard>
  );
};

export default InstagramDirectSettings;