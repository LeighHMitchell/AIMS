import React from "react";

export function Pagination({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <nav className={`flex items-center justify-center gap-2 ${className}`}>{children}</nav>;
}

export function PaginationContent({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`flex items-center gap-1 ${className}`}>{children}</div>;
}

export function PaginationItem({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={className}>{children}</div>;
}

export function PaginationPrevious({ onClick, "aria-disabled": ariaDisabled, className = "" }: { onClick?: () => void; "aria-disabled"?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ariaDisabled}
      className={`px-2 py-1 rounded text-body text-muted-foreground hover:bg-muted disabled:text-gray-300 disabled:cursor-not-allowed ${className}`}
      aria-label="Previous page"
    >
      &lt;
    </button>
  );
}

export function PaginationNext({ onClick, "aria-disabled": ariaDisabled, className = "" }: { onClick?: () => void; "aria-disabled"?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ariaDisabled}
      className={`px-2 py-1 rounded text-body text-muted-foreground hover:bg-muted disabled:text-gray-300 disabled:cursor-not-allowed ${className}`}
      aria-label="Next page"
    >
      &gt;
    </button>
  );
}

export function PaginationLink({ isActive, onClick, children, className = "" }: { isActive?: boolean; onClick?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-body ${isActive ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:bg-muted"} ${className}`}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </button>
  );
} 