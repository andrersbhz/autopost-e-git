import { Link } from 'react-router-dom';
import { LayoutDashboard, FileText, TrendingUp, Bot, Activity, Clock, Settings, User as UserIcon, Search as SearchIcon, Facebook, Globe, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User } from '@supabase/supabase-js';

export const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: FileText, label: 'Artigos', path: '/articles' },
  { icon: UserIcon, label: 'Autores', path: '/authors' },
  { icon: SearchIcon, label: 'Google', path: '/google' },
  { icon: Facebook, label: 'Meta', path: '/meta' },
  { icon: TrendingUp, label: 'Tendências', path: '/trends' },
  { icon: Bot, label: 'Robô Social', path: '/robot' },
  { icon: Activity, label: 'Analytics', path: '/analytics' },
  { icon: Globe, label: 'Mapa Live', path: '/map' },
  { icon: Clock, label: 'Agendamentos', path: '/schedule' },
  { icon: Palette, label: 'Marca / Vendas', path: '/branding' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
] as const;

interface AdminMenuProps {
  user: User;
}

const AdminMenu = ({ user }: AdminMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0669B2] text-white rounded-full font-black text-[10px] hover:bg-[#055a9a] hover:shadow-md transition-all duration-200 active:scale-95 uppercase">
        <LayoutDashboard className="h-3 w-3" /> Painel Admin
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="bg-gray-900 border border-gray-800 shadow-2xl z-[100] min-w-[220px]">
      <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-gray-400">
        {user.email}
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-gray-800" />
      {ADMIN_NAV.map((item) => (
        <DropdownMenuItem key={item.path} asChild className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 text-white px-3 py-2">
          <Link to={item.path} className="flex items-center gap-2.5">
            <item.icon className="h-3.5 w-3.5 text-[#0669B2]" />
            <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default AdminMenu;
