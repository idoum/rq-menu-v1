import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  /** Pre-rendered icon element, e.g. <FolderOpen className="h-10 w-10" /> */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Either a pre-rendered ReactNode or a simple {label, href} object for a link button */
  action?: React.ReactNode | { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  // Render action: if it's a simple link object, render as Link button, otherwise render as-is
  const actionElement = (() => {
    if (!action) return null;
    if (typeof action === 'object' && action !== null && 'label' in action && 'href' in action) {
      const { label, href } = action as { label: string; href: string };
      return (
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          {label}
        </Link>
      );
    }
    return action;
  })();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {actionElement && <div className="mt-6">{actionElement}</div>}
    </div>
  );
}

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const alertVariants = {
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    icon: <Info className="h-5 w-5 text-blue-500" />,
    title: 'text-blue-800 dark:text-blue-200',
    content: 'text-blue-700 dark:text-blue-300',
  },
  success: {
    container: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    title: 'text-green-800 dark:text-green-200',
    content: 'text-green-700 dark:text-green-300',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
    icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    title: 'text-yellow-800 dark:text-yellow-200',
    content: 'text-yellow-700 dark:text-yellow-300',
  },
  error: {
    container: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    icon: <XCircle className="h-5 w-5 text-red-500" />,
    title: 'text-red-800 dark:text-red-200',
    content: 'text-red-700 dark:text-red-300',
  },
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const styles = alertVariants[variant];

  return (
    <div className={cn('rounded-lg border p-4', styles.container, className)}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">{styles.icon}</div>
        <div className="flex-1">
          {title && <h3 className={cn('font-medium mb-1', styles.title)}>{title}</h3>}
          <div className={cn('text-sm', styles.content)}>{children}</div>
        </div>
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-primary', spinnerSizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Chargement...' }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}
