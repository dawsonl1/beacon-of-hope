# Plan 02 — Home Page

## Organization

**Beacon of Hope** — A US-based 501(c)(3) nonprofit operating safe homes for girls who are survivors of sexual abuse and trafficking in the Philippines. Contracts with in-country partners to provide safehouses and rehabilitation services. Funded entirely by donations.

**Real data**: 60 residents across 9 safehouses (3 regions: Luzon, Visayas, Mindanao), 60 supporters, 420+ donations, active social media across Instagram, Facebook, LinkedIn, WhatsApp, TikTok, YouTube.

---

## Personas

### 1. Maria Chen — Recurring Monetary Donor

- **Demographics**: 42, marketing manager in Manila, household income ~$120k, Filipino-American
- **Relationship to org**: Found Beacon of Hope through a friend's Instagram share 8 months ago. Made her first donation of ₱1,000 through the website. Has since donated 3 more times (monetary, recurring).
- **Digital behavior**: Checks Instagram and Facebook daily. Reads email newsletters. Browses on her phone 70% of the time. Won't spend more than 10 seconds on a page that doesn't hook her.
- **Motivations**: Personally connected to the cause — grew up in the Philippines and knows girls in vulnerable situations. Wants to feel like her money goes directly to a girl's recovery, not overhead.
- **Goals on the home page**:
  - Instantly understand what Beacon of Hope does and who it helps
  - See concrete proof her donations are working (not vague "we help people" language)
  - One-click path to donate again
  - Share something compelling with her friends
- **Frustrations**:
  - Nonprofit sites that are all emotion and no data
  - Having to dig through pages to find the donate button
  - No updates on what happened with her money after she gave it
  - Slow, clunky mobile experiences
- **Key question**: "I already believe in this cause — show me my money matters and make it easy to give more."

### 2. Pastor James Okafor — Community Leader & Potential Partner

- **Demographics**: 55, leads a 300-member church in suburban Texas, organized 2 prior mission partnerships
- **Relationship to org**: Has never heard of Beacon of Hope. A colleague forwarded him a link after a conference presentation about trafficking in Southeast Asia. This is his first visit.
- **Digital behavior**: Primarily uses desktop. Reads thoroughly — will scroll the entire page if the content is substantive. Skeptical of flashy sites with no depth.
- **Motivations**: Wants to find a cause his congregation can rally around for their annual mission focus. Needs to vet the organization before he brings it to his leadership board. Cares about accountability, transparency, and measurable outcomes.
- **Goals on the home page**:
  - Understand the full scope of Beacon of Hope's work (not just a tagline)
  - See measurable outcomes: how many girls helped, what "helped" actually means, reintegration rates
  - Understand how the organization operates (safehouses, staff, partners, regions)
  - Find a way to connect beyond just donating — volunteer, partner, advocate
- **Frustrations**:
  - "Feel good" sites with stock photos and no substance
  - No way to contact a real person or explore partnership
  - No financial transparency or impact metrics
  - Sites that only have a "Donate" button and nothing else
- **Key question**: "Is this organization legitimate, effective, and worthy of my congregation's support?"

### 3. Elena Reyes — Safehouse Staff / Social Worker

- **Demographics**: 34, licensed social worker based in Cebu City, manages cases at Safehouse 2
- **Relationship to org**: Employee. Uses the site to show families and referring agencies what Beacon of Hope does. Sometimes directs government partners to the home page as a reference.
- **Digital behavior**: Uses both phone and desktop. Familiar with the organization but sees the site through the eyes of the people she sends to it.
- **Motivations**: Needs the public site to be professional and trustworthy so that when she refers families or partners to it, it reinforces the legitimacy of the organization.
- **Goals on the home page**:
  - Quick access to login (staff portal)
  - A site she's proud to share with referring agencies, government partners, and families
  - Clear explanation of services for families who are considering placing a girl
- **Frustrations**:
  - An unprofessional site undermines her credibility with government agencies
  - Having to explain what the organization does because the website doesn't do it well
- **Key question**: "Can I send someone here and trust it represents us well?"

---

## User Stories — Home Page

### Navigation & First Impression

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 1 | First-time visitor | See a clear, compelling headline and mission statement within 2 seconds of loading | I immediately understand what this organization does | Hero section visible without scrolling, mission stated in <15 words |
| 2 | Any visitor | See a professional, trustworthy design | I don't bounce thinking this is a scam or amateur operation | Clean typography, consistent color palette, no stock photo clichés |
| 3 | Mobile visitor | Have the full experience work on my phone | I can engage with the site wherever I am | All sections responsive, touch targets ≥44px, Lighthouse mobile score ≥90 |
| 4 | Staff member | Find the login link quickly | I can get to the admin portal without hunting | Login link visible in header nav |

### Impact & Trust

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 5 | Potential donor | See real impact numbers (girls served, safehouses, outcomes) | I trust this organization is effective | At least 3 live stats pulled from the database, not hardcoded |
| 6 | Community leader | Understand how the safehouse model works | I can explain it to my congregation | "How it works" section with clear 3-4 step explanation |
| 7 | Any visitor | See anonymized success stories or outcome summaries | I emotionally connect with the mission | At least 2 stories/testimonials displayed |
| 8 | Skeptical visitor | See where the organization operates (regions, number of safehouses) | I believe this is a real, operating organization | Map or regional breakdown showing Luzon, Visayas, Mindanao presence |

### Engagement & Conversion

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 9 | Potential donor | See a prominent donate button without scrolling | I can act on my impulse to give | CTA button in hero section and at least one more on the page |
| 10 | Potential donor | Understand what my donation actually funds | I feel confident about where my money goes | Copy that connects donation amounts to tangible outcomes (e.g., "₱500 = one week of education supplies") |
| 11 | Potential partner | Find a way to contact the organization or explore involvement | I can start a conversation about partnership | Contact section or "Get Involved" with multiple options (donate, volunteer, partner, advocate) |
| 12 | Social media visitor | Share the page or a specific stat easily | I can spread the word to my network | Shareable content or social links present |

### Compliance & Accessibility

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 13 | Any visitor | See a cookie consent banner on first visit | The site is GDPR compliant | Functional cookie consent (not just cosmetic), links to privacy policy |
| 14 | Any visitor | Access the privacy policy from the footer | I can understand how my data is used | Privacy policy link in footer, policy page exists |
| 15 | Visitor with disability | Navigate the entire page with a screen reader or keyboard | The site is accessible to everyone | Lighthouse accessibility ≥90%, proper heading hierarchy, alt text on all images |

---

## Page Structure

### Header / Nav
- Logo + "Beacon of Hope" wordmark
- Nav links: Home, About, Impact, Get Involved, Login
- Mobile: hamburger menu

### Section 1 — Hero
- **Headline**: Short, powerful mission statement (e.g., "Restoring hope. Rebuilding lives.")
- **Subheadline**: One sentence expanding on what Beacon of Hope does
- **Primary CTA**: "Donate Now" button
- **Secondary CTA**: "See Our Impact" (scrolls to impact section)
- **Visual**: Warm, hopeful imagery (NOT exploitative photos of children — use abstract, light-filled imagery or illustrations)

### Section 2 — Impact at a Glance
- 3-4 animated counters pulling live data from the database:
  - Total girls served (residents count)
  - Active safehouses (safehouses count)
  - Reintegration success rate (completed reintegrations / total)
  - Regions covered (3: Luzon, Visayas, Mindanao)
- These should be real numbers from the API, not hardcoded

### Section 3 — How It Works
- 3-4 step visual flow:
  1. **Rescue & Referral** — Girls are referred through government agencies, NGOs, or court orders
  2. **Safe Housing** — Placed in one of our safehouses with 24/7 care and support
  3. **Rehabilitation** — Counseling, education, health services, and intervention planning
  4. **Reintegration** — Prepared for family reunification, foster care, or independent living
- Keep it simple, visual, and honest about the process

### Section 4 — Stories of Hope
- 2-3 anonymized outcome summaries (drawn from public_impact_snapshots or aggregated resident data)
- Focus on progress, not trauma — "A 15-year-old referred through a government agency has completed her education program and is preparing for family reunification"
- NO real names, NO photos of actual residents

### Section 5 — Get Involved
- Cards or tiles for different ways to help:
  - **Donate** — monetary contributions
  - **Volunteer** — time and skills
  - **Partner** — organizational partnerships
  - **Advocate** — social media sharing
- Each links to appropriate next step

### Section 6 — Footer
- Privacy policy link (required)
- Contact information
- Social media links (Instagram, Facebook, LinkedIn)
- "Beacon of Hope is a 501(c)(3) nonprofit organization"
- Cookie consent banner (GDPR requirement)

---

## Design Principles

1. **Dignity first** — Never use exploitative imagery. These are real survivors. The site should communicate hope and strength, not pity.
2. **Trust through transparency** — Show real numbers, real outcomes. Donors give more when they trust.
3. **Mobile-first** — Maria is on her phone. Design for 375px width first, scale up.
4. **Fast** — Target <3s load time. Lazy load images, minimize JS bundle.
5. **Accessible** — Lighthouse ≥90% from day one. Semantic HTML, proper contrast ratios, keyboard navigable.

---

## Data the Home Page Needs from the API

| Endpoint | Data | Source Tables |
|----------|------|--------------|
| `GET /api/impact/summary` | Total residents served, active safehouses, reintegration rate, regions | residents, safehouses |
| `GET /api/impact/snapshots` | Latest public impact snapshots for Stories section | public_impact_snapshots |

These are public, unauthenticated endpoints — they return only aggregated, anonymized data.

---

## Definition of Done

- [ ] All 6 sections rendered and responsive (desktop + mobile)
- [ ] Impact numbers pulled live from the API (not hardcoded)
- [ ] Lighthouse accessibility score ≥90%
- [ ] Lighthouse performance score ≥90%
- [ ] Cookie consent banner functional
- [ ] Privacy policy page linked from footer
- [ ] Login link in nav goes to login page
- [ ] All images have alt text
- [ ] No real names or identifying information of residents displayed
