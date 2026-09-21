import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, ShoppingCart, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function AdminSystemPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ users: 0, articles: 0, sales: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Basic counts
      const { count: artCount } = await supabase.from('articles').select('*', { count: 'exact', head: true });
      const { count: sCount } = await supabase.from('sales' as any).select('*', { count: 'exact', head: true });
      
      // Detailed user list via RPC
      const { data: userData, error: userError } = await supabase.rpc('get_admin_profiles');
      
      if (userError) throw userError;

      setStats({
        users: userData?.length || 0,
        articles: artCount || 0,
        sales: sCount || 0
      });
      setUsers(userData || []);
    } catch (err) {
      console.error('[AdminSystemPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, plan: 'basico' | 'avancado' | 'enterprise') => {
    const limit = plan === 'basico' ? 1 : plan === 'avancado' ? 10 : 50;
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_plan: plan, blog_limit: limit })
      .eq('id', userId);

    if (error) {
      console.error('Error updating plan:', error);
      return;
    }
    fetchAdminData();
  };

  if (authLoading) return <div className="p-8 text-center">Carregando autenticação...</div>;
  if (!isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Gestão Total do Sistema</h1>
          <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest mt-1">Controle de Usuários e Assinaturas</p>
        </div>
        <Badge className="bg-[#a3ff12]/20 text-[#a3ff12] border-[#a3ff12]/30 py-1 px-3">
          <ShieldCheck className="h-3 w-3 mr-2" /> Super Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-[#a3ff12]/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Usuários Totais</CardTitle>
            <Users className="h-4 w-4 text-[#a3ff12]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.users}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Clientes Ativos</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-[#b57bff]/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Conteúdo Gerado</CardTitle>
            <FileText className="h-4 w-4 text-[#b57bff]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.articles}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Artigos no Sistema</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-success/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Vendas Confirmadas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.sales}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Total Conversões</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden border-white/10">
        <CardHeader className="border-b border-white/5 bg-white/[0.02]">
          <CardTitle className="text-lg uppercase tracking-tighter flex items-center gap-2">
            <Users className="h-5 w-5 text-[#a3ff12]" /> 
            Lista de Usuários e Planos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/5">
                  <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Usuário</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Cadastrado em</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Plano Atual</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Limite Blogs</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando dados...</TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="font-bold text-xs text-white">{u.email}</TableCell>
                    <TableCell className="text-xs text-white/70">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={
                        u.subscription_plan === 'enterprise' ? 'bg-[#b57bff]/20 text-[#b57bff] border-[#b57bff]/30' :
                        u.subscription_plan === 'avancado' ? 'bg-[#a3ff12]/20 text-[#a3ff12] border-[#a3ff12]/30' :
                        'bg-white/10 text-white border-white/20'
                      }>
                        {u.subscription_plan?.toUpperCase() || 'BÁSICO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-white/90">{u.blog_limit || 1}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <select 
                          className="bg-black border border-white/20 text-[10px] rounded px-2 py-1 outline-none focus:border-[#a3ff12] text-white"
                          value={u.subscription_plan || 'basico'}
                          onChange={(e) => updateUserPlan(u.id, e.target.value as 'basico' | 'avancado' | 'enterprise')}
                        >
                          <option value="basico">Básico</option>
                          <option value="avancado">Avançado</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
