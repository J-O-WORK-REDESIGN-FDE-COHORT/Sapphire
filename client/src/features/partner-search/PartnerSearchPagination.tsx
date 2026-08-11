// T036–T039: PartnerSearchPagination — SCRUM-26 / SCRUM-27
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PartnerSearchPaginationProps {
  /** Zero-based current page index */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PartnerSearchPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PartnerSearchPaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <Pagination aria-label="Search results pagination">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={currentPage === 0}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 0) onPageChange(currentPage - 1);
            }}
            className={currentPage === 0 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {pageNumbers.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              isActive={page === currentPage}
              aria-label={`Page ${page + 1}`}
              aria-current={page === currentPage ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(page);
              }}
            >
              {page + 1}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={currentPage === totalPages - 1}
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
            }}
            className={currentPage === totalPages - 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
