import { useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import StaticPageLayout from '@/components/blog/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { maskPhoneBR, isValidPhoneBR } from '@/lib/masks';

const ContactPage = () => {
  const [sending, setSending] = useState(false);
  const [phone, setPhone] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhoneBR(phone)) {
      toast({ title: 'Telefone inválido', description: 'Use DDD + número (10 ou 11 dígitos)', variant: 'destructive' });
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: 'Mensagem enviada', description: 'Retornaremos em breve. Obrigado!' });
      (e.target as HTMLFormElement).reset();
      setPhone('');
    }, 600);
  };

  return (
    <StaticPageLayout
      kicker="Fale Conosco"
      title="Contato"
      description="Sugestões de pauta, correções, parcerias ou dúvidas? Envie sua mensagem — respondemos todos os contatos."
    >
      <div className="grid md:grid-cols-3 gap-4 not-prose mb-8">
        <div className="border border-[hsl(var(--news-line))] p-5">
          <Mail className="h-5 w-5 text-[hsl(var(--news-accent))] mb-3" />
          <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--news-muted))]">E-mail</div>
          <div className="text-sm font-semibold mt-1">contato@a3portal.com</div>
        </div>
        <div className="border border-[hsl(var(--news-line))] p-5">
          <Phone className="h-5 w-5 text-[hsl(var(--news-accent))] mb-3" />
          <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--news-muted))]">Telefone</div>
          <div className="text-sm font-semibold mt-1">+55 (11) 0000-0000</div>
        </div>
        <div className="border border-[hsl(var(--news-line))] p-5">
          <MapPin className="h-5 w-5 text-[hsl(var(--news-accent))] mb-3" />
          <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--news-muted))]">Endereço</div>
          <div className="text-sm font-semibold mt-1">São Paulo, SP — Brasil</div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 not-prose">
        <div className="grid md:grid-cols-2 gap-4">
          <Input required name="name" placeholder="Seu nome" />
          <Input required type="email" name="email" placeholder="Seu e-mail" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Input required name="phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(maskPhoneBR(e.target.value))} placeholder="Telefone (11) 99999-9999" maxLength={16} />
          <Input required name="subject" placeholder="Assunto" />
        </div>
        <Textarea required name="message" placeholder="Sua mensagem" rows={6} />
        <Button type="submit" disabled={sending} className="bg-[hsl(var(--news-accent))] hover:brightness-110 text-white">
          {sending ? 'Enviando…' : 'Enviar mensagem'}
        </Button>
      </form>
    </StaticPageLayout>
  );
};

export default ContactPage;
