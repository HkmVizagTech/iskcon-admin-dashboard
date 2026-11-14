import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Standard page title row.
// Phones: back arrow + title, subtitle below, then the actions in a row that
//         wraps (primary action last, so it lands at the right / on its own).
// Desktop: title on the left, actions on the right.
export default function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex items-start gap-2 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="p-1.5 -ml-1.5 mt-0.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight break-words">{title}</h1>
          {subtitle && <div className="text-sm sm:text-base text-gray-600 mt-1">{subtitle}</div>}
        </div>
      </div>
      {actions && (
        // Each action shares the row on phones. A <Link> wrapping a <Button>
        // gets its button stretched too, so pages don't have to remember to.
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:flex-shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none [&>a>button]:w-full sm:[&>a>button]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
