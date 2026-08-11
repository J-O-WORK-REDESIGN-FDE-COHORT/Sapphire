// T032–T033: Regression tests — existing pages unaffected by SCRUM-26 sidebar changes — SCRUM-27
// Verifies that partner-services and registered-partners routes still work post sidebar update

import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { describe, it, expect, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
  useLocation: () => ["/partner-services", vi.fn()],
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "test@example.com" } }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), AnalyticsEvents: {} }));
vi.mock("@/components/wellness-recommendations", () => ({ default: () => null }));

const Sidebar = (await import("@/components/sidebar")).default;

describe("Regression: sidebar nav — existing routes unaffected", () => {
  it("still renders Wellness Partners link", async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <Sidebar />
      </MockedProvider>
    );
    const link = await screen.findByRole("link", { name: /wellness partners/i });
    expect(link).toHaveAttribute("href", "/registered-partners");
  });

  it("still renders Wellness Services link", async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <Sidebar />
      </MockedProvider>
    );
    const link = await screen.findByRole("link", { name: /wellness services/i });
    expect(link).toHaveAttribute("href", "/partner-services");
  });

  it("still renders Find a Partner link alongside existing links", async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <Sidebar />
      </MockedProvider>
    );
    const links = await screen.findAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/registered-partners");
    expect(hrefs).toContain("/partner-services");
    expect(hrefs).toContain("/find-partner");
  });
});
