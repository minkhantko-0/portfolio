/**
 * The flight: one stop per country the work shipped to, in the order the
 * paper plane flies them. A round-the-world trip that starts where the
 * career did (Yangon) and ends at home (Bangkok). Chronology lives in the
 * periods; geography decides the order so the globe never flies backwards.
 *
 * `id` is the world-atlas numeric country id (matches mapMarkers in
 * resume.ts and the hatch fills on the globe texture). lon/lat is the city
 * the plane lands at, not the country centroid.
 */
export interface Stop {
  id: string;
  country: string;
  city: string;
  lon: number;
  lat: number;
  home?: boolean;
  /** the clients / employers at this stop, shortest form, for the pin tooltip */
  client: string;
  /** the chapter */
  role: string;
  period: string;
  bullets: string[];
  links?: { label: string; href: string }[];
  /** a handwritten aside */
  note?: string;
  /** which side of the pin the label sits on, so neighbours do not collide */
  label?: 'left' | 'right' | 'below' | 'above';
}

export const route: Stop[] = [
  {
    id: '104',
    country: 'Myanmar',
    city: 'Yangon',
    lon: 96.17,
    lat: 16.87,
    client: 'KBZ Bank · MyanCare · Sun Community Health',
    role: 'Full Stack Developer, then Supervising Full Stack Developer',
    period: '2022 – 2026',
    bullets: [
      'Owned the back-end of the MyanCare telehealth app: REST APIs, PostgreSQL stored procedures, role-based access, data-encryption policies. 700+ doctors on the other end.',
      'Architected the bank’s first AI product at KBZ Bank on AWS Bedrock, Lambda, S3 and EventBridge, and supervised the front-end team that shipped it.',
      'Web development consulting for Sun Community Health, a national healthcare NGO.',
    ],
    links: [
      { label: 'KBZ Wiki', href: 'https://kbzwiki.kbzbank.com/' },
      { label: 'MyanCare', href: 'https://myancare.org/' },
    ],
    note: 'where it started',
    label: 'left',
  },
  {
    id: '702',
    country: 'Singapore',
    city: 'Singapore',
    lon: 103.82,
    lat: 1.35,
    client: 'Partipost',
    role: 'Product Engineer',
    period: 'Mar 2026 – present',
    bullets: [
      'Back-end API integrations for the Partipost mobile app: contract schemas, data-fetching patterns, the works.',
      'The Campaign Manager web portal used by brands and agencies, from rendering logic to API consumption.',
      'Responsive UI and shared component-library contributions, shipped in an agile cycle with product, design and back-end.',
    ],
    links: [{ label: 'Partipost', href: 'https://www.partipost.com/' }],
    label: 'right',
  },
  {
    id: '392',
    country: 'Japan',
    city: 'Tokyo',
    lon: 139.69,
    lat: 35.69,
    client: 'a private client',
    role: 'Sole developer, cross-platform app',
    period: '2022 – 2024',
    bullets: [
      'A React Native app with a tRPC back-end, designed, built and shipped alone for a Japanese client.',
      'API contracts kept consistent between the mobile front-end and the Node.js services behind it.',
    ],
    note: 'one person, both ends',
    label: 'right',
  },
  {
    id: '840',
    country: 'USA',
    city: 'United States',
    lon: -98.5,
    lat: 39.8,
    client: 'OYA Health · Social Lady',
    role: 'Web development consultant',
    period: '2026',
    bullets: [
      'OYA Health: revamped the landing site and rebuilt the customer registration workflow on Next.js and Google Cloud.',
      'Social Lady: an AI-powered daily email digest that summarises incoming mail so high-value inquiries never get lost (n8n, OpenAI, Outlook Mail API).',
    ],
    links: [
      { label: 'OYA Health', href: 'https://oya.health/' },
      { label: 'Social Lady', href: 'https://social-lady.com/' },
    ],
    label: 'below',
  },
  {
    id: '250',
    country: 'France',
    city: 'France',
    lon: 2.35,
    lat: 48.86,
    client: 'B4Purpose',
    role: 'Web development consultant',
    period: '2026',
    bullets: [
      'Consulting for B4Purpose, a non-profit: scoping requirements and turning goals into a technical roadmap.',
      'Landing pages and registration workflows, with advice on performance, SEO and deployment.',
    ],
    note: 'tech for good',
    label: 'left',
  },
  {
    id: '203',
    country: 'Czechia',
    city: 'Prague',
    lon: 14.42,
    lat: 50.09,
    client: 'Voix Advisory',
    role: 'Web Development Consultant',
    period: 'Jun 2026 – present',
    bullets: [
      'Consulting for businesses, NGOs and non-profits through Voix Advisory: scoping, roadmaps, and the builds that follow.',
      'Client web projects end-to-end: landing pages, customer registration workflows, AI-powered automations.',
      'Technology selection, performance, SEO and deployment strategy, with ongoing maintenance.',
    ],
    links: [{ label: 'Voix Advisory', href: 'https://www.voiximpact.com/' }],
    label: 'above',
  },
  {
    id: '764',
    country: 'Thailand',
    city: 'Bangkok',
    lon: 100.5,
    lat: 13.75,
    home: true,
    client: 'I’m currently here',
    role: 'Based in Thailand, working remotely',
    period: 'now',
    bullets: [
      'Every stop above was shipped from here, remote, across seven time zones.',
      'Cloud and DevOps consulting for TwoSteps.ai from here too: the Benchmark clinical platform, its ELK observability stack, and infrastructure across AWS, Azure, GCP and Cloudflare.',
    ],
    links: [{ label: 'Benchmark', href: 'https://www.benchmarkps.org/' }],
    note: 'home base',
    label: 'below',
  },
];

/** the three-letter form the count uses: "3 of 7" */
export const stopCount = route.length;
