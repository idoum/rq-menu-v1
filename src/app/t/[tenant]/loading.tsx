import { Skeleton } from '@/components/ui/skeleton';

export default function TenantLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
