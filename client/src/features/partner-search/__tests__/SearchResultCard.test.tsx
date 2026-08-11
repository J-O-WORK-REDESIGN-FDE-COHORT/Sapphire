// T029: SearchResultCard unit test — SCRUM-27
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SearchResultCard } from "../SearchResultCard";
import type { PartnerServiceItem } from "../partnerSearch.types";

const mockItem: PartnerServiceItem = {
  id: "svc-1",
  name: "Morning Yoga",
  description: "A gentle morning yoga class for all levels.",
  category: "FITNESS",
  partnerName: "Sunrise Wellness",
};

describe("SearchResultCard", () => {
  it("renders service name", () => {
    render(<SearchResultCard item={mockItem} />);
    expect(screen.getByText("Morning Yoga")).toBeInTheDocument();
  });

  it("renders partner name", () => {
    render(<SearchResultCard item={mockItem} />);
    expect(screen.getByText("Sunrise Wellness")).toBeInTheDocument();
  });

  it("renders category badge", () => {
    render(<SearchResultCard item={mockItem} />);
    expect(screen.getByText("FITNESS")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<SearchResultCard item={mockItem} />);
    expect(screen.getByText(/gentle morning yoga/i)).toBeInTheDocument();
  });
});
