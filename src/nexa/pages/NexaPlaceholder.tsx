import { Clock } from "lucide-react";

interface Props { title: string; stage: string; description: string; }

export default function NexaPlaceholder({ title, stage, description }: Props) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-lime-400 mb-1">Módulo</p>
        <h1 className="text-2xl font-bold text-slate-50">{title}</h1>
      </div>

      <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-10 text-center">
        <Clock className="h-12 w-12 text-slate-700 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-200">Disponível em {stage}</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">{description}</p>
        <p className="text-xs text-slate-600 mt-6">
          A Etapa 1 entrega a fundação multiempresa. Este módulo será ativado depois sem perda de dados.
        </p>
      </div>
    </div>
  );
}
