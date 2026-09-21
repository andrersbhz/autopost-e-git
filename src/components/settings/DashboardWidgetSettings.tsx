import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Layout, GripVertical } from "lucide-react";
import AppearancePaletteSettings from "@/components/settings/AppearancePaletteSettings";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface DashboardWidgets {
  stats: boolean;
  meta: boolean;
  robot: boolean;
  trends: boolean;
  categories: boolean;
  audit: boolean;
  alternate_stats: boolean;
  chart: boolean;
}

interface DashboardWidgetSettingsProps {
  widgets: DashboardWidgets;
  order: string[];
  onChange: (widgets: DashboardWidgets) => void;
  onOrderChange: (order: string[]) => void;
}

const widgetLabels: Record<string, string> = {
  stats: "Estatísticas Gerais (Principais)",
  meta: "Páginas do Facebook (Meta)",
  robot: "Robô Social Humano",
  trends: "Google Trends Preview",
  categories: "Métricas por Categoria",
  audit: "Logs de Auditoria",
  alternate_stats: "Métricas Alternativas (Posts/Agendamentos)",
  chart: "Gráfico de Atividade (Artigos)",
};

const SortableWidget = ({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: () => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto', position: 'relative' as const };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between rounded-lg border border-border/60 bg-background/45 px-3 py-3 transition-colors hover:bg-muted/35 ${isDragging ? 'opacity-50 border-primary shadow-lg' : ''}`}>
      <div className="flex items-center gap-3 flex-1">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-primary/10 transition-colors" aria-label={`Reordenar ${label}`}>
          <GripVertical className="h-4 w-4" />
        </button>
        <Label htmlFor={`widget-${id}`} className="flex-1 cursor-pointer font-medium text-sm">{label}</Label>
      </div>
      <Switch id={`widget-${id}`} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
};

const DashboardWidgetSettings = ({ widgets, order, onChange, onOrderChange }: DashboardWidgetSettingsProps) => {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      onOrderChange(arrayMove(order, oldIndex, newIndex));
    }
  };

  const toggleWidget = (key: keyof DashboardWidgets) => onChange({ ...widgets, [key]: !widgets[key] });
  const currentOrder = [...order];
  Object.keys(widgetLabels).forEach((key) => { if (!currentOrder.includes(key)) currentOrder.push(key); });

  return (
    <div className="space-y-6">
      <AppearancePaletteSettings />
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/15">
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Widgets do Dashboard</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Selecione os painéis e <strong className="text-foreground">arraste para organizar</strong> a ordem na página inicial.</p>
        </CardHeader>
        <CardContent className="space-y-2 p-5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>
              {currentOrder.map((key) => (
                <SortableWidget key={key} id={key} label={widgetLabels[key]} checked={widgets[key as keyof DashboardWidgets]} onCheckedChange={() => toggleWidget(key as keyof DashboardWidgets)} />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardWidgetSettings;
