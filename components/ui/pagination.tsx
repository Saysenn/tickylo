import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (p: number) => void;
}

/** Returns the page numbers to render, inserting null for ellipsis gaps. */
function getPageRange(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [1];

  if (page > 3) pages.push(null); // left ellipsis

  const start = Math.max(2, page - 1);
  const end   = Math.min(totalPages - 1, page + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (page < totalPages - 2) pages.push(null); // right ellipsis

  pages.push(totalPages);
  return pages;
}

export function Pagination({ page, totalPages, onPrev, onNext, onGoTo }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onPrev}
        disabled={page === 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {pages.map((p, i) =>
        p === null ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-ink-3 select-none">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant="outline"
            size="icon-sm"
            onClick={() => onGoTo(p)}
            className={cn(
              page === p && "bg-mint/15 border-mint/30 text-ink font-semibold",
            )}
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="icon-sm"
        onClick={onNext}
        disabled={page === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
