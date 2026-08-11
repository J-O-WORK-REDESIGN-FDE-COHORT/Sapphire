// T030: PartnerSearchResults unit test — SCRUM-27
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PartnerSearchResults } from "../PartnerSearchResults";
import type { HybridSearchResult } from "../partnerSearch.types";

const mockData: HybridSearchResult = {
  keywordResults: [
    { id: "k1", name: "Yoga Class", description: "Daily yoga", category: "FITNESS", partnerName: "Studio A" },
  ],
  semanticResults: [
    { id: "s1", name: "Sleep Coaching", description: "Better sleep", category: "WELLNESS_COACHING", partnerName: "Rest Co" },
  ],
  totalKeywordResults: 1,
  totalSemanticResults: 1,
};

describe("PartnerSearchResults", () => {
  it("renders nothing when not called and not loading", () => {
    const { container } = render(
      <PartnerSearchResults data={null} loading={false} called={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders keyword and semantic section headings after search", () => {
    render(
      <PartnerSearchResults data={mockData} loading={false} called={true} />
    );
    expect(screen.getByRole("heading", { name: /keyword matches/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /semantic matches/i })).toBeInTheDocument();
  });

  it("always renders semantic section even when semantic results are empty (C1 fix)", () => {
    const dataWithNoSemantic: HybridSearchResult = {
      ...mockData,
      semanticResults: [],
      totalSemanticResults: 0,
    };
    render(
      <PartnerSearchResults data={dataWithNoSemantic} loading={false} called={true} />
    );
    expect(screen.getByRole("heading", { name: /semantic matches/i })).toBeInTheDocument();
    expect(screen.getByText(/no semantic matches found/i)).toBeInTheDocument();
  });

  it("shows error alert when error is provided", () => {
    render(
      <PartnerSearchResults
        data={null}
        loading={false}
        error={new Error("upstream error")}
        called={true}
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders skeleton cards while loading", () => {
    render(
      <PartnerSearchResults data={null} loading={true} called={true} />
    );
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
  });
});
