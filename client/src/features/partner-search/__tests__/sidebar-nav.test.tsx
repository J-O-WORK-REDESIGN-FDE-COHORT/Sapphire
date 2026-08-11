// T012: Sidebar nav test — verifies "Find a Partner" link renders — SCRUM-27
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { describe, it, expect, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
  useLocation: () => ["/find-partner", vi.fn()],
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "test@example.com" } }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), AnalyticsEvents: {} }));
vi.mock("@/components/wellness-recommendations", () => ({ default: () => null }));

const Sidebar = (await import("@/components/sidebar")).default;

describe("Sidebar — Find a Partner nav item", () => {
  it("renders a 'Find a Partner' link", async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <Sidebar />
      </MockedProvider>
    );
    const link = await screen.findByRole("link", { name: /find a partner/i });
    expect(link).toHaveAttribute("href", "/find-partner");
  });
});
