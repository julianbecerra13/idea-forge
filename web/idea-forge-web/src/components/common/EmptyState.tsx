import { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Icon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
