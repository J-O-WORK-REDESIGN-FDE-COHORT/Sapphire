// T011: Route test — verifies /find-partner renders FindPartner page — SCRUM-27
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "test@example.com" }, isAuthenticated: true }),
}));
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({ alerts: [], markAsRead: vi.fn(), markAllAsRead: vi.fn(), clearAll: vi.fn() }),
}));
vi.mock("@/lib/analytics", () => ({
  trackPage: vi.fn(),
  trackEvent: vi.fn(),
  AnalyticsEvents: { PARTNER_SERVICE_VIEWED: "partner_service_viewed" },
}));

// Dynamic import of the page to keep setup light
const FindPartner = (await import("@/pages/find-partner")).default;

describe("Route: /find-partner", () => {
  it("renders the Find a Partner page heading", async () => {
    render(
      <MockedProvider>
        <FindPartner />
      </MockedProvider>
    );
    expect(
      screen.getByRole("heading", { name: /find a partner/i })
    ).toBeInTheDocument();
  });
});
