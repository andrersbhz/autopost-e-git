import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

export default function NexaLogin() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate("/nexa/dashboard");
      } else {
        await signUp(email, password);
        toast({ title: "Conta criada", description: "Verifique seu email para confirmar e depois faça login." });
        setMode("login");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-lime-400 flex items-center justify-center">
            <span className="text-slate-950 font-black text-lg">N</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">NEXA Insight</h1>
            <p className="text-xs text-slate-400 -mt-0.5">Inteligência de atendimento</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold mb-1">
            {mode === "login" ? "Entrar na plataforma" : "Criar conta"}
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            {mode === "login" ? "Use seu email corporativo." : "Comece um teste gratuito."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-slate-300 text-xs">Email</Label>
              <Input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="bg-slate-950 border-slate-700 mt-1"
                placeholder="voce@empresa.com"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Senha</Label>
              <Input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} className="bg-slate-950 border-slate-700 mt-1"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-lime-400 text-slate-950 hover:bg-lime-300 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 w-full text-center text-xs text-slate-400 hover:text-lime-300"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link to="/" className="hover:text-slate-300">← Voltar ao site principal</Link>
        </p>
      </div>
    </div>
  );
}
