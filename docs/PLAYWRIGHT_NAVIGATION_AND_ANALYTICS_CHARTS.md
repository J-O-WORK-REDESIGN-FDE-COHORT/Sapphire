# Sapphire FitConnect — Playwright Navigation Scenarios & Amplitude/Segment Chart Ideas

## Overview

This document defines:
1. **User Persona Profiles** — who each user is and their intent
2. **Navigation Scenarios** — step-by-step UI journeys for each persona, ready to be scripted in Playwright
3. **Segment Events Emitted** — which analytics events each journey fires
4. **Amplitude / Segment Chart Ideas** — charts, funnels, and journey maps to build from the collected event data

---

## 1. User Persona Profiles

| Persona | Email | Plan | Archetype | Primary Goal |
|---------|-------|------|-----------|--------------|
| **Sarah Chen** | sarah.chen@sapphirewellness.com | **Premium** | Health Optimizer | Monitors health metrics daily, uses AI Wellness Buddy, acts on recommendations |
| **Marcus Johnson** | marcus.johnson@sapphirewellness.com | **Premium** | Fitness Enthusiast | Subscribes to fitness services, tracks activity, explores partner services |
| **Elena Rodriguez** | elena.rodriguez@sapphirewellness.com | Free → Premium | Upgrader | Starts free, discovers premium value, upgrades |
| **David Kim** | david.kim@sapphirewellness.com | Free | Casual Browser | Logs in, browses dashboard and partners, does not convert |
| **Maya Patel** | maya.patel@sapphirewellness.com | Free | Service Seeker | Navigates to My Services, subscribes to a free-tier service |
| **Margaret Thompson** | margaret.thompson@sapphirewellness.com | Free | Alert Checker | Logs in, checks health alerts, views profile, logs out |

---

## 2. Navigation Scenarios

### Scenario 1 — Sarah Chen: Premium Deep Engagement Journey
**Persona:** Premium Health Optimizer  
**Goal:** Full platform engagement — dashboard → health data → recommendations → wellness coach → logout  
**Segment Events fired:** `User Logged In`, `Dashboard Viewed`, `Health Data Viewed`, `Chart Interacted`, `Recommendation Viewed`, `Recommendations Generated`, `Wellness Coach Viewed`, `Wellness Coach Message Sent`, `User Logged Out`

#### Steps

```
1.  Navigate to http://localhost:5000/
2.  Click "Get Started" button                          [data-testid="button-get-started"]
3.  Fill email: sarah.chen@sapphirewellness.com         [data-testid="input-email"]
4.  Fill password: sarah123                             [data-testid="input-password"]
5.  Click Login                                         [data-testid="button-login"]
6.  Wait for Dashboard to load (assert heading "Health Dashboard")
7.  Observe Heart Rate metric card                      (triggers Health Data Viewed)
8.  Observe Steps metric card
9.  Observe Blood Pressure metric card
10. Observe Sleep metric card
11. Click "My Account" accordion in sidebar             (expand)
12. Click "My Recommendations" in sidebar               → navigate to /my-recommendations
13. Wait for recommendations to load
14. Click "Generate Recommendations" button             (triggers Recommendations Generated)
15. Wait for toast notification
16. Click on first recommendation card title            (triggers Recommendation Clicked)
17. Click "Subscribe to Service" on a recommendation    (triggers Service Subscribed)
18. Click "Sapphire Wellness Buddy" in sidebar          → navigate to /wellness-coach
19. Wait for chat interface to load
20. Type "What does my heart rate data say about my health?" in chat input
21. Click Send button                                   (triggers Wellness Coach Message Sent)
22. Wait for AI response
23. Type "Can you recommend a stress management program?"
24. Click Send button                                   (triggers Wellness Coach Message Sent)
25. Wait for AI response
26. Click Logout button                                 [data-testid="button-logout"]
27. Assert redirect to home/login page
```

---

### Scenario 2 — Marcus Johnson: Premium Service Subscription Journey
**Persona:** Premium Fitness Enthusiast  
**Goal:** Login → dashboard → browse partner services → subscribe to a fitness service → view my services → logout  
**Segment Events fired:** `User Logged In`, `Dashboard Viewed`, `Partner Service Viewed`, `Service Subscribed`, `Service Viewed`, `User Logged Out`

#### Steps

```
1.  Navigate to http://localhost:5000/
2.  Click "Get Started" button                          [data-testid="button-get-started"]
3.  Fill email: marcus.johnson@sapphirewellness.com     [data-testid="input-email"]
4.  Fill password: marcus123                            [data-testid="input-password"]
5.  Click Login                                         [data-testid="button-login"]
6.  Wait for Dashboard to load
7.  Click "Partners & Services" accordion in sidebar    (expand)
8.  Click "Wellness Services" in sidebar                → navigate to /partner-services
9.  Wait for services table to load
10. Search for "fitness" in the search box              (triggers Partner Service Viewed)
11. Observe the filtered results
12. Clear search, search for "nutrition"
13. Observe filtered results
14. Click "My Account" accordion in sidebar             (expand)
15. Click "My Services" in sidebar                      → navigate to /my-services
16. Wait for subscribed services section to load
17. Scroll down to "Browse All Services" table
18. Search for "yoga" in the services search box
19. Click "Subscribe" on the first available service    (triggers Service Subscribed)
20. Wait for success toast
21. Scroll up to verify the service appears in "Your Subscribed Services"
22. Click "Partners & Services" accordion in sidebar
23. Click "Wellness Partners" in sidebar                → navigate to /registered-partners
24. Wait for partners table to load
25. Search for "gym" in the partners search box         (triggers Partner Viewed)
26. Observe filtered partner results
27. Click Logout button                                 [data-testid="button-logout"]
```

---

### Scenario 3 — Elena Rodriguez: Free-to-Premium Upgrade Journey
**Persona:** Upgrader  
**Goal:** Login as free user → explore profile → discover premium benefits → upgrade → access wellness coach  
**Segment Events fired:** `User Logged In`, `Dashboard Viewed`, `Profile Viewed`, `Sapphire User Upgraded`, `Wellness Coach Viewed`, `User Logged Out`

#### Steps

```
1.  Navigate to http://localhost:5000/
2.  Click "Get Started" button                          [data-testid="button-get-started"]
3.  Fill email: elena.rodriguez@sapphirewellness.com    [data-testid="input-email"]
4.  Fill password: marcus123                            [data-testid="input-password"]
5.  Click Login                                         [data-testid="button-login"]
6.  Wait for Dashboard to load
7.  Assert sidebar shows "Upgrade to Premium" button    [data-testid="button-upgrade"]
8.  Assert "Sapphire Wellness Buddy" is NOT visible in sidebar (free user)
9.  Click "My Account" accordion in sidebar
10. Click "My Profile" in sidebar                       → navigate to /user-profile
11. Wait for profile page to load                       (triggers Profile Viewed)
12. Assert membership shows "Free Member"
13. Observe "Upgrade to Premium" section with benefits list
14. Click "Upgrade to Premium" button in sidebar        [data-testid="button-upgrade"]
15. Wait for upgrade success toast ("Welcome to Premium!")
16. Assert sidebar now shows "Premium Features Unlocked"
17. Assert "Sapphire Wellness Buddy" link appears in sidebar
18. Click "My Profile" again to verify premium status
19. Assert membership shows "Premium Member" with Crown icon
20. Click "Sapphire Wellness Buddy" in sidebar          → navigate to /wellness-coach
21. Wait for chat interface to load                     (triggers Wellness Coach Viewed)
22. Type "What are my premium benefits?"
23. Click Send button                                   (triggers Wellness Coach Message Sent)
24. Wait for response
25. Click Logout button                                 [data-testid="button-logout"]
```

---

### Scenario 4 — David Kim: Casual Browser (No Conversion)
**Persona:** Casual Browser  
**Goal:** Login → browse dashboard → check partners → check alerts → logout without converting  
**Segment Events fired:** `User Logged In`, `Dashboard Viewed`, `Partner Viewed`, `Alerts Viewed`, `User Logged Out`

#### Steps

```
1.  Navigate to http://localhost:5000/
2.  Click "Get Started" button                          [data-testid="button-get-started"]
3.  Fill email: david.kim@sapphirewellness.com          [data-testid="input-email"]
4.  Fill password: david123                             [data-testid="input-password"]
5.  Click Login                                         [data-testid="button-login"]
6.  Wait for Dashboard to load                          (triggers Dashboard Viewed)
7.  Observe health metric cards (Heart Rate, Steps, BP, Sleep)
8.  Scroll down to view Heart Rate chart
9.  Scroll down to view Activity chart
10. Scroll down to view Blood Pressure chart
11. Click "Partners & Services" accordion in sidebar
12. Click "Wellness Partners" in sidebar                → navigate to /registered-partners
13. Wait for partners table to load                     (triggers Partner Viewed)
14. Observe the list of partners (no action taken)
15. Click "My Account" accordion in sidebar
16. Click "My Alerts" in sidebar                        → navigate to /my-alerts
17. Wait for alerts to load                             (triggers Alerts Viewed)
18. Observe alerts (or "No Alerts" message)
19. Navigate back to Dashboard via sidebar link
20. Assert "Upgrade to Premium" button is visible       [data-testid="button-upgrade"]
21. Do NOT click upgrade (casual browser, no conversion)
22. Click Logout button                                 [data-testid="button-logout"]
```

---

### Scenario 5 — Maya Patel: Service Discovery & Subscription Journey
**Persona:** Service Seeker  
**Goal:** Login → browse services → subscribe to a service → view subscription → logout  
**Segment Events fired:** `User Logged In`, `Dashboard Viewed`, `Service Viewed`, `Service Subscribed`, `User Logged Out`

#### Steps

```
1.  Navigate to http://localhost:5000/
2.  Click "Get Started" button                          [data-testid="button-get-started"]
3.  Fill email: maya.patel@sapphirewellness.com         [data-testid="input-email"]
4.  Fill password: maya123                              [data-testid="input-password"]
5.  Click Login                                         [data-testid="button-login"]
6.  Wait for Dashboard to load
7.  Click "My Account" accordion in sidebar
8.  Click "My Services" in sidebar                      → navigate to /my-services
9.  Wait for page to load                               (triggers Service Viewed)
10. Assert "No Active Subscriptions" message is shown
11. Scroll down to "Browse All Services" table
12. Wait for services table to load
13. Search for "mental" in the search box
14. Observe filtered results
15. Clear search
16. Search for "nutrition" in the search box
17. Observe filtered results
18. Clear search
19. Click "Subscribe" on the first available service    (triggers Service Subscribed)
20. Wait for success toast "Successfully subscribed to service!"
21. Scroll up to "Your Subscribed Services" section
22. Assert the newly subscribed service card is visible
23. Observe service card details (partner name, category, pricing, valid until date)
24. Click "Partners & Services" accordion in sidebar
25. Click "Wellness Services" in sidebar                → navigate to /partner-services
26. Wait for services table to load                     (triggers Partner Service Viewed)
27. Observe available services
28. Click Logout button                                 [data-testid="button-logout"]
```

---

### Scenario 6 — Margaret Thompson: Alert & Profile Check Journey
**Persona:** Alert Checker  
**Goal:** Login → check alerts → view profile → check notification bell → logout  
**Segment Events fired:** `User Logged In`, `Dashboard Viewed`, `Alerts Viewed`, `Profile Viewed`, `Notification Clicked`, `User Logged Out`

#### Steps

```
1.  Navigate to http://localhost:5000/
2.  Click "Get Started" button                          [data-testid="button-get-started"]
3.  Fill email: margaret.thompson@sapphirewellness.com  [data-testid="input-email"]
4.  Fill password: margaret123                          [data-testid="input-password"]
5.  Click Login                                         [data-testid="button-login"]
6.  Wait for Dashboard to load                          (triggers Dashboard Viewed)
7.  Click the Notification Bell icon in the header      (triggers Notification Clicked)
8.  Observe notification panel (mark all as read if any)
9.  Close notification panel
10. Click "My Account" accordion in sidebar
11. Click "My Alerts" in sidebar                        → navigate to /my-alerts
12. Wait for alerts to load                             (triggers Alerts Viewed)
13. Observe health alerts list
14. If alerts exist: observe alert details (metric name, timestamp, message)
15. If no alerts: assert "No Alerts" message with green bell icon
16. Click "My Profile" in sidebar                       → navigate to /user-profile
17. Wait for profile to load                            (triggers Profile Viewed)
18. Observe personal information section (name, email)
19. Observe account details section (membership type: Free)
20. Observe physical attributes (gender, height, weight) if available
21. Observe wellness summary section
22. Navigate back to Dashboard via sidebar
23. Observe health metric cards one more time
24. Click Logout button                                 [data-testid="button-logout"]
```

---

## 3. Segment Events Reference Table

The following events are already instrumented in the codebase (`client/src/lib/analytics.ts`):

| Event Name | Trigger | Key Properties |
|------------|---------|----------------|
| `User Logged In` | Successful OIDC login | `email`, `timestamp` |
| `User Logged Out` | Logout button click | — |
| `Sapphire User Upgraded` | Upgrade mutation completes | `userId`, `timestamp` |
| `Dashboard Viewed` | Dashboard page mount | `userId`, `timestamp` |
| `Health Data Viewed` | Health data section viewed | `userId` |
| `Chart Interacted` | Chart component interaction | `chartType`, `userId` |
| `Profile Viewed` | User Profile page mount | `userId`, `timestamp` |
| `Alerts Viewed` | My Alerts page mount | `userId`, `timestamp` |
| `Service Viewed` | My Services page mount | `userId`, `timestamp` |
| `Service Subscribed` | Subscribe mutation completes | `serviceId`, `userId`, `timestamp` |
| `Service Unsubscribed` | Unsubscribe mutation completes | `serviceId`, `userId`, `timestamp` |
| `Partner Viewed` | Registered Partners page mount | `userId`, `timestamp` |
| `Partner Service Viewed` | Partner Services page mount | `userId`, `timestamp` |
| `Partner Onboarded` | Onboard partner form submit | `partnerName`, `partnerType`, `userId` |
| `Recommendation Viewed` | My Recommendations page mount | `userId`, `timestamp` |
| `Recommendations Generated` | Generate button clicked | `userId`, `timestamp` |
| `Recommendation Clicked` | Recommendation card clicked | `recommendationId`, `userId` |
| `Wellness Coach Viewed` | Wellness Coach page mount | `userId`, `timestamp` |
| `Wellness Coach Message Sent` | Chat message submitted | `userId`, `threadId`, `messageLength`, `timestamp` |
| `Notification Received` | WebSocket alert received | `alertType`, `userId` |
| `Notification Clicked` | Notification bell clicked | `userId` |
| `Notification Dismissed` | Notification dismissed | `userId` |
| `Page Viewed` | Any page navigation | `pageName`, `userId` |

---

## 4. Amplitude / Segment Chart Ideas

### 4.1 User Segmentation Charts

#### Chart 1: Active Users by Membership Tier
- **Type:** Pie / Donut Chart
- **Metric:** Count of unique users by `plan` trait (premium vs free)
- **Segment Query:** `identify` calls where `traits.plan = 'premium'` vs `'free'`
- **Purpose:** Understand premium adoption rate
- **Amplitude:** User Composition chart — segment by user property `plan`

---

#### Chart 2: User Engagement Score by Persona
- **Type:** Bar Chart (grouped)
- **Metric:** Average number of events per session, grouped by user
- **Events counted:** `Dashboard Viewed` + `Service Viewed` + `Recommendation Viewed` + `Wellness Coach Message Sent` + `Alerts Viewed`
- **Purpose:** Identify which users are most engaged vs casual browsers
- **Amplitude:** Event Segmentation — count all events, group by `userId`, compare Sarah/Marcus (premium) vs David/Margaret (free)

---

#### Chart 3: Feature Adoption by User Tier
- **Type:** Stacked Bar Chart
- **Metrics per tier:**
  - Free users: % who viewed Dashboard, % who viewed Alerts, % who viewed Services
  - Premium users: % who used Wellness Coach, % who generated recommendations, % who subscribed to services
- **Purpose:** Show which features drive premium value
- **Amplitude:** Event Segmentation — filter by user property `plan`, compare event counts

---

#### Chart 4: Daily Active Users (DAU) Trend
- **Type:** Line Chart (time series)
- **Metric:** Unique users firing `User Logged In` per day
- **Breakdown:** Premium vs Free
- **Purpose:** Track platform growth and retention over time
- **Amplitude:** Event Segmentation — `User Logged In`, unique users, daily interval, group by `plan`

---

#### Chart 5: Session Duration Distribution
- **Type:** Histogram
- **Metric:** Time between `User Logged In` and `User Logged Out` per session
- **Breakdown:** Premium vs Free users
- **Purpose:** Premium users should have longer sessions (more features to use)
- **Amplitude:** Session Length chart — segment by user property `plan`

---

### 4.2 User Journey Maps

#### Journey Map 1: Full Premium User Journey (Sarah Chen archetype)
- **Type:** Sankey / Flow Diagram
- **Events in sequence:**
  ```
  User Logged In
    → Dashboard Viewed
      → My Recommendations (Recommendation Viewed)
        → Recommendations Generated
          → Recommendation Clicked
            → Service Subscribed
              → Wellness Coach Viewed
                → Wellness Coach Message Sent (×N)
                  → User Logged Out
  ```
- **Purpose:** Visualise the ideal premium engagement path
- **Amplitude:** Pathfinder — starting event `User Logged In`, ending event `User Logged Out`, show top paths

---

#### Journey Map 2: Free-to-Premium Conversion Path (Elena Rodriguez archetype)
- **Type:** Sankey / Flow Diagram
- **Events in sequence:**
  ```
  User Logged In
    → Dashboard Viewed
      → Profile Viewed
        → Sapphire User Upgraded
          → Wellness Coach Viewed
            → Wellness Coach Message Sent
              → User Logged Out
  ```
- **Purpose:** Understand what pages/actions precede an upgrade decision
- **Amplitude:** Pathfinder — starting event `User Logged In`, ending event `Sapphire User Upgraded`, show top paths before conversion

---

#### Journey Map 3: Casual Browser Drop-off Path (David Kim archetype)
- **Type:** Sankey / Flow Diagram
- **Events in sequence:**
  ```
  User Logged In
    → Dashboard Viewed
      → Partner Viewed  (or Alerts Viewed)
        → User Logged Out   ← exits without converting
  ```
- **Purpose:** Identify where non-converting users drop off
- **Amplitude:** Pathfinder — starting event `User Logged In`, ending event `User Logged Out`, filter users who did NOT fire `Sapphire User Upgraded`

---

#### Journey Map 4: Service Subscription Path (Maya Patel archetype)
- **Type:** Sankey / Flow Diagram
- **Events in sequence:**
  ```
  User Logged In
    → Dashboard Viewed
      → Service Viewed
        → Partner Service Viewed
          → Service Subscribed
            → User Logged Out
  ```
- **Purpose:** Understand the service discovery-to-subscription flow
- **Amplitude:** Pathfinder — starting event `Service Viewed`, ending event `Service Subscribed`

---

### 4.3 Funnel Charts

#### Funnel 1: Free-to-Premium Conversion Funnel
- **Type:** Conversion Funnel
- **Steps:**
  1. `User Logged In` (all users)
  2. `Dashboard Viewed`
  3. `Profile Viewed` (saw upgrade CTA)
  4. `Sapphire User Upgraded` (converted)
- **Purpose:** Measure conversion rate at each step; identify biggest drop-off point
- **Amplitude:** Funnel Analysis — ordered funnel, conversion window 7 days
- **Expected insight:** Most drop-off likely between step 3 → 4 (saw CTA but didn't convert)

---

#### Funnel 2: Recommendation-to-Service-Subscription Funnel
- **Type:** Conversion Funnel
- **Steps:**
  1. `Recommendation Viewed` (landed on recommendations page)
  2. `Recommendations Generated` (clicked generate)
  3. `Recommendation Clicked` (opened a recommendation card)
  4. `Service Subscribed` (subscribed from recommendation)
- **Purpose:** Measure how effectively recommendations drive service subscriptions
- **Amplitude:** Funnel Analysis — ordered funnel, conversion window 1 session
- **Expected insight:** Drop-off between step 2 → 3 shows recommendation quality; drop-off 3 → 4 shows pricing friction

---

#### Funnel 3: Wellness Coach Engagement Funnel (Premium Only)
- **Type:** Conversion Funnel
- **Steps:**
  1. `User Logged In` (premium users only)
  2. `Wellness Coach Viewed` (navigated to coach)
  3. `Wellness Coach Message Sent` (sent first message)
  4. `Wellness Coach Message Sent` (sent 3+ messages — deep engagement)
- **Purpose:** Measure Wellness Coach adoption and depth of engagement among premium users
- **Amplitude:** Funnel Analysis — filter by user property `plan = premium`, count `Wellness Coach Message Sent` ≥ 3 for step 4
- **Expected insight:** Gap between step 2 → 3 shows onboarding friction; step 3 → 4 shows retention

---

#### Funnel 4: Partner Service Discovery Funnel
- **Type:** Conversion Funnel
- **Steps:**
  1. `User Logged In`
  2. `Partner Service Viewed` (browsed wellness services)
  3. `Service Viewed` (navigated to My Services)
  4. `Service Subscribed` (subscribed to a service)
- **Purpose:** Measure partner service discovery-to-subscription conversion
- **Amplitude:** Funnel Analysis — ordered funnel, conversion window 3 days

---

#### Funnel 5: Health Alert Engagement Funnel
- **Type:** Conversion Funnel
- **Steps:**
  1. `Notification Received` (real-time alert via WebSocket)
  2. `Notification Clicked` (opened notification bell)
  3. `Alerts Viewed` (navigated to My Alerts page)
  4. `Recommendation Viewed` (acted on alert by checking recommendations)
- **Purpose:** Measure how effectively health alerts drive users to take action
- **Amplitude:** Funnel Analysis — ordered funnel, conversion window 1 hour (real-time alerts)

---

### 4.4 Retention & Cohort Charts

#### Chart 6: Weekly Retention by Membership Tier
- **Type:** Retention Table / Heatmap
- **Metric:** % of users who return and fire `User Logged In` in subsequent weeks
- **Cohort:** Users who first logged in during a given week
- **Breakdown:** Premium vs Free
- **Purpose:** Premium users should show higher retention; quantify the retention lift from premium
- **Amplitude:** Retention Analysis — starting event `User Logged In`, returning event `User Logged In`, weekly intervals, group by `plan`

---

#### Chart 7: Feature Stickiness (DAU/MAU)
- **Type:** Line Chart
- **Metric:** DAU/MAU ratio for key features
- **Features tracked:**
  - Dashboard (`Dashboard Viewed`)
  - Wellness Coach (`Wellness Coach Viewed`) — premium only
  - Recommendations (`Recommendation Viewed`)
  - Alerts (`Alerts Viewed`)
- **Purpose:** Identify which features are "sticky" (used daily vs monthly)
- **Amplitude:** Event Segmentation — DAU/MAU formula per event, overlay on single chart

---

#### Chart 8: Post-Upgrade Behaviour Cohort
- **Type:** Cohort Analysis
- **Cohort definition:** Users who fired `Sapphire User Upgraded`
- **Behaviour tracked (days 1, 3, 7, 14, 30 post-upgrade):**
  - `Wellness Coach Viewed`
  - `Recommendations Generated`
  - `Service Subscribed`
- **Purpose:** Understand which premium features users adopt first after upgrading, and which drive long-term retention
- **Amplitude:** Retention Analysis — cohort entry event `Sapphire User Upgraded`, return events as above

---

### 4.5 Revenue & Conversion Metrics

#### Chart 9: Upgrade Conversion Rate Over Time
- **Type:** Line Chart
- **Metric:** (Count of `Sapphire User Upgraded` / Count of `User Logged In` by free users) × 100
- **Interval:** Daily / Weekly
- **Purpose:** Track whether product changes improve free-to-premium conversion
- **Amplitude:** Formula metric — `Sapphire User Upgraded` / `User Logged In` (filtered to free users)

---

#### Chart 10: Service Subscription Rate by Category
- **Type:** Bar Chart
- **Metric:** Count of `Service Subscribed` events, grouped by service category (FITNESS, NUTRITION, MENTAL_HEALTH, WELLNESS_COACHING, etc.)
- **Purpose:** Identify which service categories are most popular; inform partner acquisition strategy
- **Amplitude:** Event Segmentation — `Service Subscribed`, group by event property `serviceCategory`

---

#### Chart 11: Recommendations-to-Subscription Conversion Rate
- **Type:** KPI / Metric Card + Trend Line
- **Metric:** (Count of `Service Subscribed` where source = recommendations / Count of `Recommendations Generated`) × 100
- **Purpose:** Measure ROI of the AI recommendation engine
- **Amplitude:** Formula metric — requires adding `source: 'recommendation'` property to `Service Subscribed` events fired from the recommendations page

---

### 4.6 AI Feature Analytics (Wellness Coach)

#### Chart 12: Wellness Coach Message Volume by User
- **Type:** Bar Chart (ranked)
- **Metric:** Total `Wellness Coach Message Sent` count per user
- **Purpose:** Identify power users of the AI coach; understand engagement depth
- **Amplitude:** Event Segmentation — `Wellness Coach Message Sent`, group by `userId`, top 10

---

#### Chart 13: Wellness Coach Session Length Distribution
- **Type:** Histogram
- **Metric:** Count of `Wellness Coach Message Sent` per session (per `threadId`)
- **Buckets:** 1 message, 2–3 messages, 4–6 messages, 7+ messages
- **Purpose:** Understand conversation depth; 7+ messages = highly engaged session
- **Amplitude:** Event Segmentation — `Wellness Coach Message Sent`, group by `threadId`, distribution

---

#### Chart 14: Wellness Coach Adoption Rate (Premium Users)
- **Type:** Funnel / KPI
- **Metric:** % of premium users who have fired `Wellness Coach Viewed` at least once
- **Purpose:** Track feature adoption; low adoption = onboarding/discoverability problem
- **Amplitude:** Event Segmentation — unique users who fired `Wellness Coach Viewed` / unique premium users who fired `User Logged In`

---

## 5. Playwright Script Structure Recommendations

When writing the Playwright scripts in your separate repo, use the following structure:

### JSON Data File Pattern
```json
[
  {
    "email": "sarah.chen@sapphirewellness.com",
    "password": "sarah123",
    "firstName": "Sarah",
    "lastName": "Chen",
    "plan": "premium",
    "scenario": "deep-engagement"
  }
]
```

### Test File Pattern
```typescript
// tests/scenario-name.spec.ts
import { test, expect } from '@playwright/test';
import users from './data/scenario-users.json' assert { type: 'json' };

users.forEach((user, index) => {
  test(`scenario-name user ${index + 1} - ${user.firstName}`, async ({ page }) => {
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:5000/');
    await page.getByTestId('button-get-started').click();
    await page.getByTestId('input-email').fill(user.email);
    await page.getByTestId('input-password').fill(user.password);
    await page.getByTestId('button-login').click();
    await page.waitForTimeout(3000);
    // ... scenario-specific steps
    await page.getByTestId('button-logout').click();
  });
});
```

### Key `data-testid` Attributes Available
| Element | data-testid |
|---------|-------------|
| Get Started button (home) | `button-get-started` |
| Email input (login) | `input-email` |
| Password input (login) | `input-password` |
| Login button | `button-login` |
| Logout button | `button-logout` |
| Upgrade to Premium button (sidebar) | `button-upgrade` |
| Wellness Coach nav link (sidebar) | `button-wellness-coach` |
| Wellness Recommendations button | `button-wellness-recommendations` |
| Close recommendations button | `button-close-recommendations` |
| Upgrade Professional button | `button-upgrade-professional` |
| Confirm purchase button | `button-confirm-purchase` |

### Sidebar Navigation Pattern (no data-testid — use text/role)
```typescript
// Expand "My Account" accordion
await page.getByRole('button', { name: 'My Account' }).click();

// Navigate to sub-pages
await page.getByRole('link', { name: 'My Profile' }).click();
await page.getByRole('link', { name: 'My Alerts' }).click();
await page.getByRole('link', { name: 'My Services' }).click();
await page.getByRole('link', { name: 'My Recommendations' }).click();

// Expand "Partners & Services" accordion
await page.getByRole('button', { name: 'Partners & Services' }).click();
await page.getByRole('link', { name: 'Wellness Partners' }).click();
await page.getByRole('link', { name: 'Wellness Services' }).click();

// Premium only
await page.getByRole('link', { name: 'Sapphire Wellness Buddy' }).click();
```

---

## 6. Recommended Playwright Test File Organisation

```
tests/
├── data/
│   ├── scenario-1-sarah-deep-engagement.json
│   ├── scenario-2-marcus-service-subscription.json
│   ├── scenario-3-elena-upgrade-journey.json
│   ├── scenario-4-david-casual-browser.json
│   ├── scenario-5-maya-service-seeker.json
│   └── scenario-6-margaret-alert-checker.json
├── scenarios/
│   ├── 01-premium-deep-engagement.spec.ts        (Sarah)
│   ├── 02-premium-service-subscription.spec.ts   (Marcus)
│   ├── 03-free-to-premium-upgrade.spec.ts        (Elena)
│   ├── 04-casual-browser-no-conversion.spec.ts   (David)
│   ├── 05-service-seeker-subscription.spec.ts    (Maya)
│   └── 06-alert-checker-profile-view.spec.ts     (Margaret)
└── playwright.config.ts
```

---

*Generated for Sapphire FitConnect — Product Analytics & Quality Engineering*  
*Made with Bob*

---

## 7. Workshop Data Volume — How Long to Run the Scripts

### The Core Problem: Amplitude/Segment Need Enough Events to Draw Meaningful Charts

For a workshop demo the charts need to show:
- **Funnels** with visible drop-off percentages (need ≥ 20–30 users per step to avoid 0% or 100% artefacts)
- **Retention tables** with at least 2–3 cohort rows (need data across multiple days)
- **Journey maps / Pathfinder** with branching paths (need ≥ 50 sessions so minority paths appear)
- **Time-series DAU charts** with a visible trend line (need ≥ 5–7 data points = days)

---

### 7.1 Minimum Viable Dataset for a Workshop

| Chart Type | Minimum Events Needed | Minimum Unique Users | Minimum Days of Data |
|------------|----------------------|---------------------|---------------------|
| Funnel (conversion) | ~200 total events across funnel steps | 30–50 users | 1 day is fine |
| Segmentation bar/pie | ~100 events | 20+ users | 1 day is fine |
| DAU trend line | 7 data points | 10+ users/day | **7 days** |
| Retention table | 3 cohort rows | 20+ users per cohort | **3 weeks** (impractical) |
| Pathfinder / Journey map | ~500 sessions | 50+ users | 3–5 days |
| Session duration histogram | ~100 sessions | 30+ users | 1 day is fine |

**Practical conclusion:** For a workshop you can skip retention tables (they need real calendar time). Focus on **funnels, segmentation, journey maps, and DAU trends** — these can all be populated in **5–7 days** of simulated runs.

---

### 7.2 Recommended Run Schedule

The key insight is: **Amplitude/Segment timestamp events at the moment they are received**. You cannot backdate events via the standard JS SDK. So to get a 7-day trend line you need to actually run the scripts on 7 different days — OR use the Segment HTTP API / Amplitude HTTP API with a custom `timestamp` property to inject historical data.

#### Option A — Natural Run Schedule (Recommended for authenticity)

Run the full Playwright suite **once per day for 7 days** before the workshop.

```
Day -7  (1 week before workshop):  Full suite run × 1
Day -6:  Full suite run × 1
Day -5:  Full suite run × 2  (simulate a "busy day")
Day -4:  Full suite run × 1
Day -3:  Full suite run × 3  (simulate peak usage)
Day -2:  Full suite run × 2
Day -1:  Full suite run × 2
Day  0   (workshop day):     Full suite run × 1 (live, during demo)
```

**Total runs:** ~13 full suite executions over 7 days  
**Total sessions generated:** ~13 × 6 scenarios = ~78 sessions  
**Total events generated:** ~78 × 15 avg events/session = ~1,170 events  
**Time investment:** ~5 minutes/run × 13 runs = ~65 minutes total (automated, unattended)

This gives you:
- ✅ A 7-day DAU trend line with visible variation
- ✅ Funnels with 13–39 users per step (enough for % drop-off)
- ✅ Pathfinder with 78 sessions (enough for branching paths)
- ✅ Segmentation with clear premium vs free split
- ✅ 2 users (Sarah, Marcus) consistently appearing as "power users"

---

#### Option B — Single Day Burst (If you only have 1 day)

Run the suite **multiple times in a single day** with different user subsets to simulate volume.

```
Morning run (08:00):   All 6 scenarios × 1
Mid-morning (10:00):   Scenarios 1, 2, 3 (premium + upgrader) × 2
Lunch (12:00):         All 6 scenarios × 1
Afternoon (14:00):     Scenarios 4, 5, 6 (free users) × 3
Evening (17:00):       All 6 scenarios × 1
Night (20:00):         Scenarios 1, 2 (premium) × 2
```

**Total sessions:** ~42 sessions in one day  
**Total events:** ~630 events  
**What you get:** Good funnels and segmentation, but only a **single-day spike** on the DAU chart (no trend). Acceptable for a workshop if you explain it's a simulation day.

---

#### Option C — Backdated Injection via HTTP API (Best data quality, more setup)

Use the **Segment HTTP Tracking API** or **Amplitude HTTP API v2** directly (not the browser SDK) to inject events with custom `timestamp` values set to past dates. This lets you generate a full 30-day history in minutes.

```bash
# Example: inject a "User Logged In" event backdated 7 days
curl -X POST https://api.segment.io/v1/track \
  -H "Content-Type: application/json" \
  -u YOUR_WRITE_KEY: \
  -d '{
    "userId": "sarah.chen@sapphirewellness.com",
    "event": "User Logged In",
    "timestamp": "2026-02-23T09:00:00Z",
    "properties": { "email": "sarah.chen@sapphirewellness.com" }
  }'
```

This approach requires a small Node.js/Python script to generate the full event sequence for each persona across 30 days, but gives you **the richest charts** for a workshop — including retention tables and long-term trend lines.

**Recommendation:** Use Option C for the retention/cohort charts, and Option A for the live funnel/journey data that shows real browser interactions.

---

### 7.3 Events Per Scenario (Estimated)

| Scenario | Persona | Approx Events per Run |
|----------|---------|----------------------|
| 1 — Sarah Deep Engagement | Premium | ~18 events |
| 2 — Marcus Service Subscription | Premium | ~14 events |
| 3 — Elena Upgrade Journey | Free→Premium | ~12 events |
| 4 — David Casual Browser | Free | ~8 events |
| 5 — Maya Service Seeker | Free | ~11 events |
| 6 — Margaret Alert Checker | Free | ~9 events |
| **Total per full suite run** | | **~72 events** |

---

### 7.4 What the Charts Will Look Like After 7 Days (Option A)

| Chart | Expected Appearance |
|-------|-------------------|
| **DAU Trend** | Smooth line with a visible peak on Day -5 and Day -3 (where you ran 2–3× runs) |
| **Premium vs Free Pie** | ~33% premium (Sarah + Marcus = 2 of 6 users), 67% free |
| **Upgrade Funnel** | Step 1 (Login): 100% → Step 2 (Dashboard): 100% → Step 3 (Profile): ~50% → Step 4 (Upgraded): ~17% (only Elena) |
| **Recommendation→Subscription Funnel** | Step 1 (Reco Viewed): 100% → Step 2 (Generated): ~50% → Step 3 (Clicked): ~50% → Step 4 (Subscribed): ~30% |
| **Pathfinder** | Two dominant paths: Login→Dashboard→Recommendations→Coach (Sarah) and Login→Dashboard→Services→Logout (Maya/Marcus) |
| **Session Duration** | Bimodal: short sessions ~2 min (David, Margaret) and long sessions ~8 min (Sarah, Marcus) |
| **Wellness Coach Adoption** | 100% of premium users used it (Sarah + Marcus + Elena post-upgrade) |

---

### 7.5 Practical Checklist Before the Workshop

```
[ ] 7 days before: Start daily Playwright runs (Option A)
[ ] Verify Segment write key is set in .env (VITE_SEGMENT_WRITE_KEY)
[ ] Verify events are flowing: Segment Debugger → Sources → your source → Live Events
[ ] Verify Segment → Amplitude destination is connected and enabled
[ ] Day -3: Open Amplitude, build the 5 key charts (funnel, DAU, pie, pathfinder, session duration)
[ ] Day -1: Screenshot/save charts as baseline; run suite 2× to add fresh data
[ ] Workshop day: Run suite live during demo to show real-time event flow in Segment Debugger
[ ] Have Segment Live Event Debugger open in one browser tab during the demo
[ ] Have Amplitude charts open in another tab, set to "Last 7 days"
```

---

### 7.6 Minimum Recommended Timeline Summary

| Goal | Minimum Lead Time | Runs Needed |
|------|------------------|-------------|
| Show funnels + segmentation only | **1 day** | 5–8 runs in one day |
| Show funnels + DAU trend (5 days) | **5 days** | 1 run/day |
| Show funnels + DAU trend (7 days) + journey maps | **7 days** | 1–3 runs/day |
| Show retention tables + full cohort analysis | **21+ days** OR use HTTP API backdating | N/A |
| **Recommended for a workshop** | **7 days** with Option A | ~13 runs total |
