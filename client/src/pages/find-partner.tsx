// T009 + T027: find-partner page — SCRUM-26 / SCRUM-27
import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { PartnerSearchForm } from "@/features/partner-search/PartnerSearchForm";
import { PartnerSearchResults } from "@/features/partner-search/PartnerSearchResults";
import { PartnerSearchPagination } from "@/features/partner-search/PartnerSearchPagination";
import { usePartnerSearch } from "@/features/partner-search/usePartnerSearch";
import type { PartnerSearchInput } from "@/features/partner-search/partnerSearch.types";

const PAGE_SIZE = 20;

export default function FindPartner() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { search, data, loading, error, called } = usePartnerSearch();
  const [currentPage, setCurrentPage] = useState(0);
  const [lastInput, setLastInput] = useState<Omit<PartnerSearchInput, "page" | "pageSize"> | null>(null);

  useEffect(() => {
    trackPage("Find a Partner", { userId: user?.email });
    trackEvent(AnalyticsEvents.PARTNER_SERVICE_VIEWED, {
      userId: user?.email,
      screen: "find-partner",
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);

  const handleSearch = (input: PartnerSearchInput) => {
    const { page: _page, pageSize: _pageSize, ...queryFields } = input;
    setLastInput(queryFields);
    setCurrentPage(0);
    search({ ...queryFields, page: 0, pageSize: PAGE_SIZE });
  };

  const handlePageChange = (page: number) => {
    if (!lastInput) return;
    setCurrentPage(page);
    search({ ...lastInput, page, pageSize: PAGE_SIZE });
  };

  const totalKeyword = data?.totalKeywordResults ?? 0;
  const totalSemantic = data?.totalSemanticResults ?? 0;
  const totalItems = Math.max(totalKeyword, totalSemantic);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / PAGE_SIZE) : 0;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-8">
            <h1 className="text-xl font-semibold text-slate-900">Find a Partner</h1>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-5xl">
            <p className="text-sm text-slate-600 mb-6">
              Search for wellness partner services by keyword or describe what you need in natural language.
            </p>

            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
              <PartnerSearchForm
                onSearch={handleSearch}
                loading={loading}
              />
            </div>

            <PartnerSearchResults
              data={data}
              loading={loading}
              error={error}
              called={called}
            />

            {totalPages > 1 && (
              <div className="mt-8">
                <PartnerSearchPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
