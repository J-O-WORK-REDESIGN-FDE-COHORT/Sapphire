// T026 + T034 (C1 fix): PartnerSearchResults — keyword + semantic sections
// Both sections always render; each has its own empty state — per spec US3 AC3
import { Skeleton } from "@/components/ui/skeleton";
import { SearchResultCard } from "./SearchResultCard";
import type { HybridSearchResult, PartnerServiceItem } from "./partnerSearch.types";

interface PartnerSearchResultsProps {
  data: HybridSearchResult | null;
  loading: boolean;
  error?: Error;
  called: boolean;
}

function ResultSection({
  heading,
  items,
  loading,
  emptyMessage,
}: {
  heading: string;
  items: PartnerServiceItem[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <section aria-labelledby={`${heading.replace(/\s+/g, "-").toLowerCase()}-heading`}>
      <h2
        id={`${heading.replace(/\s+/g, "-").toLowerCase()}-heading`}
        className="text-base font-semibold text-slate-800 mb-3"
      >
        {heading}
      </h2>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={`Loading ${heading}`}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <SearchResultCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export function PartnerSearchResults({
  data,
  loading,
  error,
  called,
}: PartnerSearchResultsProps) {
  if (!called && !loading) {
    return null;
  }

  if (error && !loading) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        Unable to retrieve search results. Please try again.
      </div>
    );
  }

  const keywordItems = data?.keywordResults ?? [];
  const semanticItems = data?.semanticResults ?? [];

  const showResults = called && (keywordItems.length > 0 || semanticItems.length > 0 || loading);

  if (!showResults && called && !loading) {
    return (
      <p className="text-sm text-slate-500 py-6">
        No results found. Try different keywords or adjust your search.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <ResultSection
        heading="Keyword Matches"
        items={keywordItems}
        loading={loading}
        emptyMessage="No keyword matches found."
      />
      {/* Semantic section ALWAYS renders (per spec US3 AC3 — C1 fix) */}
      <ResultSection
        heading="Semantic Matches"
        items={semanticItems}
        loading={loading}
        emptyMessage="No semantic matches found."
      />
    </div>
  );
}
