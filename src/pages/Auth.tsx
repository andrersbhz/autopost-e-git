import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Newspaper, Sparkles } from 'lucide-react';
import SpaceBackground from '@/components/SpaceBackground';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const destination = (location.state as any)?.from || '/admin';

  useEffect(() => {
    if (session?.user) {
      navigate(destination, { replace: true });
    }
  }, [session, navigate, destination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        navigate(destination, { replace: true });
      } else {
        await signUp(email.trim(), password);
        toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar.' });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: isLogin ? 'Não foi possível entrar' : 'Não foi possível criar a conta',
        description: error?.message || 'Verifique os dados informados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <SpaceBackground />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="gradient-primary p-2.5 rounded-xl shadow-neon-lilac animate-glow">
            <Newspaper className="h-6 w-6" style={{ color: '#a3ff12' }} />
          </div>
          <h1 className="text-2xl font-bold neon-text-lilac">NEURAL VORTEX</h1>
        </div>

        <Card className="glass-card shadow-elevated neon-hover-cycle">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">{isLogin ? 'Entrar' : 'Criar conta'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Acesse seu painel de automação' : 'Comece a automatizar seu blog'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-secondary/30 border-border focus:border-primary"
              />
              <PasswordInput
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="bg-secondary/30 border-border focus:border-primary"
              />
              <Button
                type="submit"
                className="w-full text-black font-semibold border border-transparent bg-[#a3ff12] hover:bg-[#a3ff12]/90 hover:border-[#a3ff12] hover:shadow-[0_0_16px_rgba(163,255,18,0.7),0_0_32px_rgba(163,255,18,0.35)] hover:-translate-y-0.5 transition-all duration-500 ease-out"
                disabled={loading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
