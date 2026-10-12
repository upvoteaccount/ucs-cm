"use client";

export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  testId?: string;
}

export function Pagination({
  currentPage,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = "",
  testId = "ucs-pagination",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (validCurrentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (validCurrentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`ucs-pagination ${className}`}
      data-testid={testId}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "var(--space-3, 0.75rem)",
        padding: "var(--space-3, 0.75rem) var(--space-4, 1rem)",
        background: "var(--color-surface, #ffffff)",
        borderTop: "1px solid var(--color-border-subtle, #e2e8f0)",
        fontSize: "0.875rem",
        color: "var(--color-text-secondary, #64748b)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4, 1rem)" }}>
        <span data-testid="pagination-count">
          Showing <strong style={{ color: "var(--color-text-primary, #1e293b)" }}>{startItem}</strong>-
          <strong style={{ color: "var(--color-text-primary, #1e293b)" }}>{endItem}</strong> of{" "}
          <strong style={{ color: "var(--color-text-primary, #1e293b)" }}>{totalItems}</strong>
        </span>

        {onPageSizeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <label htmlFor="pagination-page-size" style={{ fontSize: "0.8125rem" }}>
              Rows per page:
            </label>
            <select
              id="pagination-page-size"
              data-testid="pagination-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "var(--radius-sm, 4px)",
                border: "1px solid var(--color-border-subtle, #cbd5e1)",
                background: "var(--color-surface, #ffffff)",
                fontSize: "0.8125rem",
                color: "var(--color-text-primary, #1e293b)",
                cursor: "pointer",
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <nav
        aria-label="Pagination Navigation"
        data-testid="pagination-controls"
        style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
      >
        <button
          type="button"
          data-testid="pagination-prev"
          disabled={validCurrentPage <= 1}
          onClick={() => onPageChange(validCurrentPage - 1)}
          style={{
            padding: "0.25rem 0.625rem",
            borderRadius: "var(--radius-sm, 4px)",
            border: "1px solid var(--color-border-subtle, #cbd5e1)",
            background: validCurrentPage <= 1 ? "var(--color-surface-subtle, #f1f5f9)" : "var(--color-surface, #ffffff)",
            color: validCurrentPage <= 1 ? "var(--color-text-disabled, #94a3b8)" : "var(--color-text-primary, #1e293b)",
            cursor: validCurrentPage <= 1 ? "not-allowed" : "pointer",
            fontSize: "0.8125rem",
            fontWeight: 500,
          }}
        >
          Previous
        </button>

        {getPageNumbers().map((item, idx) => {
          if (item === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{ padding: "0.25rem 0.5rem", color: "var(--color-text-secondary, #94a3b8)" }}
              >
                ...
              </span>
            );
          }

          const isActive = item === validCurrentPage;
          return (
            <button
              key={item}
              type="button"
              data-testid={`pagination-page-${item}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onPageChange(item)}
              style={{
                minWidth: "2rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "var(--radius-sm, 4px)",
                border: isActive
                  ? "1px solid var(--color-primary-600, #2563eb)"
                  : "1px solid var(--color-border-subtle, #cbd5e1)",
                background: isActive ? "var(--color-primary-600, #2563eb)" : "var(--color-surface, #ffffff)",
                color: isActive ? "#ffffff" : "var(--color-text-primary, #1e293b)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          data-testid="pagination-next"
          disabled={validCurrentPage >= totalPages}
          onClick={() => onPageChange(validCurrentPage + 1)}
          style={{
            padding: "0.25rem 0.625rem",
            borderRadius: "var(--radius-sm, 4px)",
            border: "1px solid var(--color-border-subtle, #cbd5e1)",
            background: validCurrentPage >= totalPages ? "var(--color-surface-subtle, #f1f5f9)" : "var(--color-surface, #ffffff)",
            color: validCurrentPage >= totalPages ? "var(--color-text-disabled, #94a3b8)" : "var(--color-text-primary, #1e293b)",
            cursor: validCurrentPage >= totalPages ? "not-allowed" : "pointer",
            fontSize: "0.8125rem",
            fontWeight: 500,
          }}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
