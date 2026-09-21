import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Globe, Loader2, Save } from 'lucide-react';

interface Blog {
  id: string;
  name: string;
  wordpress_url: string;
  wordpress_username: string;
  wordpress_app_password?: string;
  is_active: boolean;
}

export function BlogManager() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newBlog, setNewBlog] = useState({ name: '', wordpress_url: '', wordpress_username: '', wordpress_app_password: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchBlogs();
    }
  }, [user]);

  const fetchBlogs = async () => {
    const { data, error } = await supabase.from('user_blogs').select('*');
    if (error) {
      toast({ title: 'Erro ao carregar blogs', description: error.message, variant: 'destructive' });
    } else {
      setBlogs(data || []);
    }
    setLoading(false);
  };

  const handleAddBlog = async () => {
    if (!user) return;
    if (!newBlog.name || !newBlog.wordpress_url) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o nome e a URL do blog.', variant: 'destructive' });
      return;
    }

    setAdding(true);
    const { data, error } = await supabase.from('user_blogs').insert([{ ...newBlog, user_id: user.id }]).select();
    
    if (error) {
      toast({ title: 'Erro ao adicionar blog', description: error.message, variant: 'destructive' });
    } else {
      if (data && data.length > 0) {
        setBlogs([...blogs, data[0]]);
      }
      setNewBlog({ name: '', wordpress_url: '', wordpress_username: '', wordpress_app_password: '' });
      toast({ title: 'Sucesso', description: 'Blog adicionado com sucesso!' });
    }
    setAdding(false);
  };

  const handleDeleteBlog = async (id: string) => {
    const { error } = await supabase.from('user_blogs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover blog', description: error.message, variant: 'destructive' });
    } else {
      setBlogs(blogs.filter(b => b.id !== id));
      toast({ title: 'Removido', description: 'Blog removido com sucesso.' });
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="glass-card neon-border-green">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Adicionar Novo Blog
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              placeholder="Nome do Blog (ex: Meu Blog Tech)" 
              value={newBlog.name} 
              onChange={e => setNewBlog({...newBlog, name: e.target.value})}
              className="bg-background/50 text-foreground"
            />
            <Input 
              placeholder="URL do WordPress (https://...)" 
              value={newBlog.wordpress_url} 
              onChange={e => setNewBlog({...newBlog, wordpress_url: e.target.value})}
              className="bg-background/50 text-foreground"
            />
            <Input 
              placeholder="Usuário WordPress" 
              value={newBlog.wordpress_username} 
              onChange={e => setNewBlog({...newBlog, wordpress_username: e.target.value})}
              className="bg-background/50 text-foreground"
            />
            <Input 
              type="password"
              placeholder="Senha de Aplicativo WP" 
              value={newBlog.wordpress_app_password} 
              onChange={e => setNewBlog({...newBlog, wordpress_app_password: e.target.value})}
              className="bg-background/50 text-foreground"
            />
          </div>
          <Button onClick={handleAddBlog} disabled={adding} className="w-full bg-[#a3ff12] text-black hover:bg-[#a3ff12]/80">
            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Salvar Blog
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blogs.map(blog => (
          <Card key={blog.id} className="glass-card group border-white/10 hover:border-primary/50 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{blog.name}</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{blog.wordpress_url}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDeleteBlog(blog.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
