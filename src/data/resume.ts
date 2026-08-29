export const profile = {
  name: "Min Khant Ko",
  title: "Software Engineer",
  tagline:
    "Software Engineer · 5 years · full-stack across fintech / healthcare / SaaS",
  summary:
    "I build and ship web and mobile products end-to-end — React and React Native up front, Node.js and Python behind the scenes, AWS and multi-cloud underneath. Five years across fintech, healthcare, SaaS, and e-commerce, working with multiple NGOs and non-profit healthcare organizations along the way — leading small teams, integrating AI services, and delivering production-ready products under tight deadlines. Currently based in Thailand, working remotely.",
  email: "th.minkhantko@gmail.com",
  phone: "+66951045725",
  linkedin: "https://www.linkedin.com/in/min-khant-ko-b846b0247/",
  github: "https://github.com/minkhantko-0",
  cvFile: "/minkhantko_cv_fullstack_engineer.pdf",
  location: "Thailand · working remotely",
};

/** lon/lat markers for the hero map (projected at build time); dx/dy are label offsets in px */
export const mapMarkers = {
  clients: [
    {
      name: "Myanmar",
      id: "104",
      lon: 96.0,
      lat: 21.0,
      dx: -84,
      dy: -10,
      client: "KBZ Bank · MyanCare",
    },
    {
      name: "Japan",
      id: "392",
      lon: 138.2,
      lat: 36.2,
      dx: 16,
      dy: -4,
      client: "a private client",
    },
    {
      name: "Singapore",
      id: "702",
      lon: 103.8,
      lat: 1.35,
      dx: 14,
      dy: 20,
      client: "Partipost",
    },
    {
      name: "France",
      id: "250",
      lon: 2.2,
      lat: 46.6,
      dx: 14,
      dy: -10,
      client: "B4Purpose",
    },
    {
      name: "Czechia",
      id: "203",
      lon: 14.4,
      lat: 50.1,
      dx: 14,
      dy: -10,
      client: "Voix Advisory · Prague",
    },
    {
      name: "USA",
      id: "840",
      lon: -98.5,
      lat: 39.8,
      dx: -18,
      dy: 28,
      client: "OYA Health · Social Lady",
    },
  ],
  home: {
    name: "Thailand",
    id: "764",
    lon: 100.9,
    lat: 15.3,
    dx: -64,
    dy: 40,
    client: "I’m currently here",
  },
};

export const highlights = [
  {
    text: "Architected an AWS-native AI platform at Myanmar’s largest private bank using Bedrock, Lambda, and EventBridge.",
    note: "the bank’s first AI product!",
  },
  {
    text: "Led cloud & DevOps strategy across AWS, Azure, GCP, Cloudflare, and Hostinger for the Benchmarkps monitoring system.",
    note: "multi-cloud, for real",
  },
  {
    text: "Built and owned both back-end and front-end for 4+ production products across fintech, healthcare, and real estate.",
    note: "full ownership",
  },
  {
    text: "Implemented an ELK stack (Elasticsearch + Kibana) for real-time performance monitoring and log aggregation.",
    note: "observability nerd",
  },
  {
    text: "Delivered a digital banking MVP (React Native + Node.js) in 2 weeks — and its admin panel in under 2 days.",
    note: "yes, really → 2 weeks",
  },
  {
    text: "Worked with NGOs and non-profits in healthcare, such as Sun Community Health Myanmar.",
    note: "tech for good",
  },
];

export interface Job {
  role: string;
  company: string;
  /** company website */
  url?: string;
  period: string;
  location: string;
  bullets: string[];
  /** phrases inside bullets to hand-annotate; type maps to rough-notation */
  annotate?: { phrase: string; type: "box" | "underline" | "highlight" }[];
}

export const experience: Job[] = [
  {
    role: "Web Development Consultant",
    company: "Voix Advisory",
    url: "https://www.voiximpact.com/",
    period: "Jun 2026 – Present",
    location: "Prague, Czechia (Remote)",
    bullets: [
      "Provide web development consulting to businesses, NGOs, and non-profit organizations — scoping requirements and translating business goals into technical roadmaps.",
      "Design, build, and ship client web projects end-to-end: landing pages, customer registration workflows, and AI-powered automations.",
      "Advise on technology selection, performance, SEO, and deployment strategy, with ongoing maintenance and support.",
    ],
    annotate: [
      { phrase: "non-profit organizations", type: "highlight" },
    ],
  },
  {
    role: "Product Engineer",
    company: "Partipost",
    url: "https://www.partipost.com/",
    period: "Mar 2026 – Present",
    location: "Singapore (Remote)",
    bullets: [
      "Develop and maintain back-end API integrations for the Partipost mobile app — contract schemas, data-fetching patterns, the works.",
      "Maintain and enhance the Campaign Manager web portal used by brands and agencies, across rendering logic and API consumption layers.",
      "Ship responsive UI and shared component-library contributions with product, design, and back-end teams in an agile cycle.",
    ],
    annotate: [{ phrase: "Campaign Manager", type: "underline" }],
  },
  {
    role: "Supervising Full Stack Developer",
    company: "KBZ Bank",
    url: "https://www.kbzbank.com/en/",
    period: "Oct 2024 – Mar 2026",
    location: "Myanmar",
    bullets: [
      "Architected and led back-end development of the bank’s first AI-integrated product — AWS Bedrock, Lambda, S3, EventBridge — from API design to infrastructure provisioning.",
      "Designed RESTful APIs and back-end services for the Employee Loan Project with strict database-security and access-control policies.",
      "Ran end-to-end delivery of the Earthquake Home Loan Project: server-side logic, deployment pipeline, third-party integrations, and front-end delivery.",
      "Upgraded Firebase Cloud Messaging from legacy APIs to HTTP v1, improving push-notification reliability.",
      "Supervised and mentored a team of front-end developers — code reviews, coding standards, the occasional pep talk.",
    ],
    annotate: [{ phrase: "first AI-integrated product", type: "highlight" }],
  },
  {
    role: "Cloud & DevOps Consultant / Full Stack Developer",
    company: "TwoSteps.ai",
    url: "https://twosteps.ai/",
    period: "Apr 2024 – Oct 2024",
    location: "Remote (Contract)",
    bullets: [
      "Most experienced cloud engineer on a team of four — hands-on architecture guidance across AWS, Azure, GCP, Cloudflare, and Hostinger VPS.",
      "Co-built Benchmarkps, an internal performance-monitoring system, focusing on the Node.js / Nest.js back-end services.",
      "Designed the ELK observability stack: real-time log aggregation, alerting, and performance dashboards.",
      "Provisioned AWS (EC2, ECS, ALB, RDS) and Azure infrastructure with Docker-based CI/CD pipelines.",
      "Locked down PostgreSQL and MongoDB with database-security and access-control policies; fronted everything with Cloudflare WAF.",
    ],
    annotate: [{ phrase: "ELK observability stack", type: "underline" }],
  },
  {
    role: "Full Stack Developer",
    company: "MyanCare Telemedicine",
    url: "https://myancare.org/",
    period: "Feb 2022 – Oct 2024",
    location: "Myanmar",
    bullets: [
      "Owned the back-end of the MyanCare TeleHealth app: REST APIs with Node.js/Express, PostgreSQL stored procedures, RBAC, and data-encryption policies.",
      "Handled both React front-end and Node.js back-end, keeping API contracts consistent between layers.",
      "Built business logic, schema migrations, and back-end services for the YinThway Call Center; reviewed code and mentored peers.",
      "Led full-stack maintenance of the YCare POS system — critical bug fixes, SQL optimisation, new features end-to-end.",
      "Sole developer on a cross-platform React Native app with a tRPC back-end for a Japanese client.",
    ],
    annotate: [{ phrase: "Sole developer", type: "highlight" }],
  },
];

export interface Project {
  name: string;
  /** what the business/product is */
  about?: string;
  /** what I did on it */
  description: string;
  tech: string[];
  link?: string;
  stores?: { ios?: string; android?: string };
  flagship?: boolean;
  note?: string;
}

export const projects: Project[] = [
  {
    name: "KBZ Wiki — AI-Powered Bank Agent",
    about:
      "An AI-powered bank agent that answers anything about KBZ Bank — always up to date on policies, announcements, loan changes, and new releases.",
    description:
      "Led back-end architecture and cloud infrastructure for the bank’s first AI product. RESTful APIs, business logic, and end-to-end front-end team delivery.",
    tech: [
      "AWS Bedrock",
      "Lambda",
      "EventBridge",
      "Nest.js",
      "React",
      "PostgreSQL",
    ],
    link: "https://kbzwiki.kbzbank.com/",
    flagship: true,
    note: "this one’s my favourite",
  },
  {
    name: "Benchmark — Clinical Performance Platform",
    about:
      "A clinical performance platform that lets physiotherapists objectively measure patient progress, benchmark results, and generate data-driven rehabilitation plans.",
    description:
      "Back-end API services, ELK-based observability stack, and multi-cloud infrastructure. Team of 4.",
    tech: [
      "Nest.js",
      "PostgreSQL",
      "Elasticsearch",
      "Kibana",
      "Docker",
      "AWS",
      "Azure",
    ],
    link: "https://www.benchmarkps.org/",
  },
  {
    name: "MyanCare TeleHealth App",
    about:
      "Myanmar’s leading telehealth app — advice, diagnosis, treatment, and prescriptions from home, with 700+ top-rated doctors across specialties via video, audio, and text.",
    description:
      "Owned the full back-end: REST API design, PostgreSQL schema and stored procedures, RBAC, and data-encryption policies. Contributed to the React front-end too.",
    tech: [
      "Node.js",
      "Express.js",
      "PostgreSQL",
      "React",
      "React Native",
      "tRPC",
    ],
    link: "https://myancare.org/",
    stores: {
      android: "https://play.google.com/store/apps/details?id=com.myancare&hl=en",
      ios: "https://apps.apple.com/us/app/myancare-telehealth/id1396490288",
    },
  },
  {
    name: "Sun Community Health — NGO",
    about:
      "A national non-governmental healthcare organization operating in Myanmar since 2022.",
    description:
      "Web development consultant across multiple projects — advising on and delivering websites and web tooling for the organization.",
    tech: ["Web Development", "Consulting", "React", "Express.js", "Node.js", "MongoDB"],
    link: "https://schmyanmar.org/",
  },
  {
    name: "OYA Health",
    about:
      "A longevity and preventive-wellness platform blending evidence-based primary care with lifestyle medicine and health-optimization technology.",
    description:
      "Revamped the landing page website and rebuilt the customer registration workflow.",
    tech: ["Web Development", "UX", "SEO", "Next.js", "Google Cloud"],
    link: "https://oya.health/",
  },
  {
    name: "Social Lady",
    about:
      "A digital and technology company helping businesses grow, scale, and reach their full potential.",
    description:
      "Built an AI-powered daily email digest that summarizes incoming mail, so potential high-value inquiries never get lost in a crowded inbox.",
    tech: ["AI", "Automation", "n8n", "OpenAI", "LLM", "Outlook Mail API", "Hostinger Cloud"],
    link: "https://social-lady.com/",
  },
  {
    name: "Meral Myanmar — Digital Banking",
    about: "A digital banking startup building the future of finance in Myanmar.",
    description:
      "Designed the Node.js/Express + PostgreSQL API layer. Led a junior dev to ship the React Native MVP in 2 weeks; built the Next.js admin panel in under 2 days.",
    tech: ["React Native", "Next.js", "Express.js", "PostgreSQL", "Clerk"],
    note: "MVP in 2 weeks",
  },
  {
    name: "Myanmar Ahla Gallery",
    about:
      "A vibrant art gallery in the heart of Yangon, showcasing emerging and established Myanmar artists.",
    description:
      "Hono-based back-end API and admin dashboard built under contract, plus the front-end landing page.",
    tech: ["Next.js", "Hono", "PostgreSQL", "Vercel"],
    link: "https://www.myanmarahla.com",
  },
  {
    name: "Magical Face Luxury Aesthetic Complex",
    about:
      "Myanmar’s biggest luxury aesthetic complex, providing facial and body aesthetic health services.",
    description:
      "Sole developer: REST API and MongoDB schema design, back-end business logic, and the React Native front-end. Delivered on schedule.",
    tech: ["React Native", "Node.js", "Express.js", "MongoDB"],
    link: "https://proxclinic.com/clinic/magical-face-luxury-aesthetic",
    stores: {
      android:
        "https://play.google.com/store/apps/details?id=com.myancare.magicalface&hl=en",
      ios: "https://apps.apple.com/us/app/magical-face-aesthetic/id6739198220",
    },
  },
  {
    name: "Z8 Real Estate",
    about:
      "Myanmar’s smartest real-estate technology platform for agents, companies, and individuals.",
    description:
      "Nest.js back-end with PostgreSQL alongside the React Native app — plus the platform website. Shipped Android and iOS MVPs with a teammate and a UI/UX designer.",
    tech: ["React Native", "Next.js", "TypeScript", "Nest.js", "PostgreSQL"],
    link: "https://z8-re.com/",
    stores: {
      android:
        "https://play.google.com/store/apps/details?id=com.mc.z8realestate&hl=en",
      ios: "https://apps.apple.com/us/app/z8/id6748935878",
    },
  },
];

export const skills: { group: string; items: string[]; note?: string }[] = [
  {
    group: "Languages",
    items: ["JavaScript", "TypeScript", "Python", "C#", "SQL"],
  },
  {
    group: "Front-End & Mobile",
    items: ["React", "React Native", "Next.js", "Angular 8+"],
  },
  {
    group: "Back-End",
    items: [
      "Node.js",
      "Nest.js",
      "Express.js",
      "FastAPI",
      "Hono",
      "Bun",
      ".NET Core",
    ],
  },
  {
    group: "AI & LLM",
    items: ["LangChain", "LangGraph", "AWS Bedrock", "S3 Vector Store"],
  },
  {
    group: "Databases",
    items: [
      "PostgreSQL",
      "MySQL",
      "MSSQL",
      "MongoDB",
      "DynamoDB",
      "Firestore",
      "Redis",
    ],
    note: "ask me about stored procedures",
  },
  {
    group: "Cloud & DevOps",
    items: [
      "AWS (Lambda, ECS, RDS…)",
      "Azure",
      "GCP",
      "Cloudflare",
      "Docker",
      "CI/CD",
    ],
  },
  {
    group: "Observability",
    items: ["Elasticsearch", "Kibana", "Logstash", "Prometheus", "Grafana"],
  },
  {
    group: "Practices",
    items: [
      "REST APIs",
      "tRPC",
      "OpenAPI/Swagger",
      "Code Review",
      "Agile/Scrum",
      "SEO",
    ],
  },
];

export const education = {
  /** attended, not completed — see the coup note below. Do not reword to a
      completed degree without also restoring `alumniOf` in Base.astro. */
  degree: "Studied Information and Communication Technology",
  school: "University of Technology (Yadanapon Cyber City)",
  period: "Jul 2018 – Jul 2021",
  notes: [
    "Computer science fundamentals, algorithms, databases, software engineering.",
    "Second prize in a university Arduino prototype contest.",
    "Left during the 2021 coup to pursue a full-time software development career.",
  ],
};

export const languages = ["English", "Burmese"];
