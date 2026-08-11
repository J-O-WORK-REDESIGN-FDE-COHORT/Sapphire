// T031: PartnerSearchPagination unit test — SCRUM-27
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PartnerSearchPagination } from "../PartnerSearchPagination";

describe("PartnerSearchPagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = render(
      <PartnerSearchPagination currentPage={0} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders page links for each page", () => {
    render(
      <PartnerSearchPagination currentPage={0} totalPages={3} onPageChange={vi.fn()} />
    );
    expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 3")).toBeInTheDocument();
  });

  it("calls onPageChange with next page on Next click", () => {
    const onPageChange = vi.fn();
    render(
      <PartnerSearchPagination currentPage={0} totalPages={3} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByRole("link", { name: /go to next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("does not call onPageChange on Previous when on first page", () => {
    const onPageChange = vi.fn();
    render(
      <PartnerSearchPagination currentPage={0} totalPages={3} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByRole("link", { name: /go to previous page/i }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
