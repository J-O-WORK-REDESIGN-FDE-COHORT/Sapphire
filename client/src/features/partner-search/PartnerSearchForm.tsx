// T024: PartnerSearchForm component — SCRUM-26 / SCRUM-27
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PartnerSearchInput } from "./partnerSearch.types";

interface PartnerSearchFormProps {
  onSearch: (input: PartnerSearchInput) => void;
  loading: boolean;
  initialKeyword?: string;
  initialSemantic?: string;
  initialPage?: number;
}

export function PartnerSearchForm({
  onSearch,
  loading,
  initialKeyword = "",
  initialSemantic = "",
  initialPage = 0,
}: PartnerSearchFormProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [semanticQuery, setSemanticQuery] = useState(initialSemantic);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKeyword = keyword.trim();
    const trimmedSemantic = semanticQuery.trim();

    // Edge case: both empty — reject without sending request
    if (!trimmedKeyword && !trimmedSemantic) {
      setValidationError("Please enter a keyword or describe what you're looking for.");
      return;
    }

    setValidationError(null);
    onSearch({
      query: trimmedKeyword || undefined,
      semanticQuery: trimmedSemantic || undefined,
      page: initialPage,
      pageSize: 20,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="keyword-search" className="text-sm font-medium text-slate-700">
          Keyword Search
        </label>
        <Input
          id="keyword-search"
          type="text"
          placeholder="e.g. yoga, nutrition, mental health"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="Keyword search query"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="semantic-search" className="text-sm font-medium text-slate-700">
          Describe what you need
        </label>
        <Input
          id="semantic-search"
          type="text"
          placeholder="e.g. something to help me sleep better"
          value={semanticQuery}
          onChange={(e) => setSemanticQuery(e.target.value)}
          aria-label="Natural language search query"
          disabled={loading}
        />
      </div>

      {validationError && (
        <p role="alert" className="text-sm text-red-600">
          {validationError}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        aria-label="Search for partner services"
        className="w-full sm:w-auto"
      >
        <Search className="w-4 h-4 mr-2" aria-hidden="true" />
        {loading ? "Searching…" : "Find a Partner"}
      </Button>
    </form>
  );
}
