import { Skeleton } from "@/components/ui/skeleton";

type LoadingStateProps = {
  type?: "skeleton" | "spinner";
  count?: number;
  variant?: "page" | "list" | "cards";
};

export default function LoadingState({
  type = "skeleton",
  count = 3,
  variant = "page",
}: LoadingStateProps) {
  if (variant === "page") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  return null;
}
