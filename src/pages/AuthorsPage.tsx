import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, User, Trash2, Save, Loader2, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AuthorsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>(['policia', 'celebridades', 'politica', 'esportes', 'saude', 'financas']);

  const [newAuthor, setNewAuthor] = useState({
    name: '',
    role: '',
    bio: '',
    avatar_url: '',
    category: '',
  });

  const fetchAuthors = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAuthors(data || []);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar autores', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('user_settings').select('categories').eq('user_id', user.id).maybeSingle();
      if (data?.categories) setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchAuthors();
    fetchCategories();
  }, [user]);

  const handleAddAuthor = async () => {
    if (!user || !newAuthor.name || !newAuthor.category) {
      toast({ title: 'Campos obrigatórios', description: 'Nome e categoria são necessários.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('authors').insert({
        ...newAuthor,
        user_id: user.id,
      });
      if (error) throw error;
      toast({ title: 'Autor criado com sucesso!' });
      setNewAuthor({ name: '', role: '', bio: '', avatar_url: '', category: '' });
      fetchAuthors();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAuthor = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este autor?')) return;
    try {
      const { error } = await supabase.from('authors').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Autor removido' });
      fetchAuthors();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Gestão de Autores</h1>
        <p className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground">Personalize a identidade dos seus escritores por categoria</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <Card className="glass-card border-primary/20 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Novo Autor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black">Nome Completo</Label>
              <Input 
                value={newAuthor.name}
                onChange={(e) => setNewAuthor({...newAuthor, name: e.target.value})}
                className="bg-secondary/20 border-white/10"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black">Função / Cargo</Label>
              <Input 
                value={newAuthor.role}
                onChange={(e) => setNewAuthor({...newAuthor, role: e.target.value})}
                className="bg-secondary/20 border-white/10"
                placeholder="Ex: Especialista em Política"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black">Categoria Principal</Label>
              <Select 
                value={newAuthor.category}
                onValueChange={(val) => setNewAuthor({...newAuthor, category: val})}
              >
                <SelectTrigger className="bg-secondary/20 border-white/10">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="uppercase text-[10px] font-bold">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black">Avatar URL</Label>
              <Input 
                value={newAuthor.avatar_url}
                onChange={(e) => setNewAuthor({...newAuthor, avatar_url: e.target.value})}
                className="bg-secondary/20 border-white/10"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black">Bio Curta</Label>
              <Textarea 
                value={newAuthor.bio}
                onChange={(e) => setNewAuthor({...newAuthor, bio: e.target.value})}
                className="bg-secondary/20 border-white/10 min-h-[100px]"
                placeholder="Breve descrição do autor..."
              />
            </div>
            <Button 
              onClick={handleAddAuthor} 
              disabled={saving}
              className="w-full gradient-primary text-[10px] font-black uppercase tracking-widest h-10 shadow-neon-lilac"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Autor'}
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Autores Atuais</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : authors.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-xs uppercase font-bold">Nenhum autor cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {authors.map((author) => (
                <Card key={author.id} className="glass-card border-white/5 hover:border-primary/20 transition-all overflow-hidden">
                  <CardContent className="p-4 flex gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-neon-lilac rounded-none">
                      <AvatarImage src={author.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-secondary/50 text-primary font-black"><User /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-black text-sm uppercase truncate text-foreground">{author.name}</h3>
                          <p className="text-[9px] font-black text-primary uppercase tracking-tighter">{author.role || 'Escritor'}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAuthor(author.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/30 text-primary bg-primary/5 rounded-none">
                          Editor de: {author.category}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2 leading-tight italic">
                        "{author.bio || 'Nenhuma biografia informada.'}"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorsPage;
