import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  actions?: React.ReactNode;
};

export default function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = "default",
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          {title}
          {badge && (
            <Badge variant={badgeVariant} className="ml-2">
              {badge}
            </Badge>
          )}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
