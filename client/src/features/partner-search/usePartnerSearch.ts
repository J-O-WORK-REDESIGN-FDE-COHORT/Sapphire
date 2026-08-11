// T023: usePartnerSearch custom Apollo hook — SCRUM-26 / SCRUM-27
import { useLazyQuery } from "@apollo/client/react";
import { FIND_PARTNERS } from "@/graphql/partnerSearch";
import type { PartnerSearchInput, HybridSearchResult } from "./partnerSearch.types";

interface UsePartnerSearchResult {
  search: (input: PartnerSearchInput) => void;
  data: HybridSearchResult | null;
  loading: boolean;
  error: Error | undefined;
  called: boolean;
}

export function usePartnerSearch(): UsePartnerSearchResult {
  const [executeSearch, { data, loading, error, called }] = useLazyQuery<{ findPartners: HybridSearchResult }>(FIND_PARTNERS, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const search = (input: PartnerSearchInput) => {
    executeSearch({ variables: { query: input } });
  };

  return {
    search,
    data: data?.findPartners ?? null,
    loading,
    error,
    called,
  };
}
