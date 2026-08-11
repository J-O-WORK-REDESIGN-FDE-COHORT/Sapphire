// T028: PartnerSearchForm unit test — SCRUM-27
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PartnerSearchForm } from "../PartnerSearchForm";

describe("PartnerSearchForm", () => {
  it("renders both input fields and submit button", () => {
    render(<PartnerSearchForm onSearch={vi.fn()} loading={false} />);
    expect(screen.getByLabelText(/keyword search query/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/natural language search query/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /find a partner/i })).toBeInTheDocument();
  });

  it("shows validation error when both fields are empty on submit", () => {
    render(<PartnerSearchForm onSearch={vi.fn()} loading={false} />);
    fireEvent.click(screen.getByRole("button", { name: /find a partner/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("calls onSearch with keyword only when keyword is provided", () => {
    const onSearch = vi.fn();
    render(<PartnerSearchForm onSearch={onSearch} loading={false} />);
    fireEvent.change(screen.getByLabelText(/keyword search query/i), {
      target: { value: "yoga" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find a partner/i }));
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "yoga", semanticQuery: undefined })
    );
  });

  it("calls onSearch with semanticQuery only when semantic is provided", () => {
    const onSearch = vi.fn();
    render(<PartnerSearchForm onSearch={onSearch} loading={false} />);
    fireEvent.change(screen.getByLabelText(/natural language search query/i), {
      target: { value: "something for sleep" },
    });
    fireEvent.click(screen.getByRole("button", { name: /find a partner/i }));
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ semanticQuery: "something for sleep", query: undefined })
    );
  });

  it("disables button and inputs when loading", () => {
    render(<PartnerSearchForm onSearch={vi.fn()} loading={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByLabelText(/keyword search query/i)).toBeDisabled();
  });
});
