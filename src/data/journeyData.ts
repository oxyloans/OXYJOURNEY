import type { LifeStage, Platform } from "../types/journey";

export const LOGO = "https://i.ibb.co/XxJJRXx5/jun-logo.png";
export const SIDEBAR_ICON = "https://i.ibb.co/5X1jWc38/junicn.png";

/**
 * The frontend stores only the main life stages.
 * The full life-cycle journey catalogue remains AI/backend driven.
 */
export const LIFE_STAGES: LifeStage[] = [
  {
    id: "birth-early-life",
    shortLabel: "Birth",
    title: "Birth & Early Life",
    description:
      "Maternity, newborn care, nutrition, childcare and parenting support.",
  },
  {
    id: "childhood-education",
    shortLabel: "Childhood",
    title: "Childhood & Education",
    description:
      "Schools, EdTech, STEM, robotics, AI, sports, arts and counselling.",
  },
  {
    id: "youth-career",
    shortLabel: "Youth",
    title: "Youth & Career",
    description:
      "Skills, study abroad, internships, career guidance, jobs and entrepreneurship.",
  },
  {
    id: "work-family",
    shortLabel: "Work & Family",
    title: "Work & Family",
    description:
      "Work, marriage, housing, mobility, insurance and family finance.",
  },
  {
    id: "health-wellness",
    shortLabel: "Health",
    title: "Health & Wellness",
    description:
      "Hospitals, diagnostics, telemedicine, home healthcare, preventive health and wellness.",
  },
  {
    id: "wealth-security",
    shortLabel: "Wealth",
    title: "Wealth & Security",
    description:
      "Banking, insurance, investments, pensions, tax and succession planning.",
  },
  {
    id: "ageing-retirement",
    shortLabel: "Ageing",
    title: "Ageing & Retirement",
    description:
      "Senior living, elder care, home nursing, second careers and retirement planning.",
  },
  {
    id: "legacy-continuity",
    shortLabel: "Legacy",
    title: "Legacy & Family Continuity",
    description:
      "Wills, succession, family archives, digital legacy and philanthropy.",
  },
];

/**
 * These are conversation examples only.
 * They help users understand what they can ask after selecting a life stage.
 */

export const LIFE_STAGE_EXAMPLES: Record<string, string[]> = {
  "birth-early-life": [
    "I need guidance on maternity care and newborn health",
    "I would like help planning baby essentials and nutrition",
    "I'm looking for childcare and parenting support",
    "I need assistance finding a paediatrician and vaccination services",
  ],

  "childhood-education": [
    "I need guidance on preschool or school admissions for my child",
    "I'm looking for STEM, robotics, or AI learning programs",
    "I would like to explore sports, arts, or counselling options",
    "I'm looking for tutoring and extracurricular activities for my child",
  ],

  "youth-career": [
    "I'm planning to study abroad and need guidance",
    "I need help choosing the right course and university",
    "I'm looking for education loan options to support my studies",
    "I need guidance on internships, job opportunities, and career planning",
  ],

  "work-family": [
    "I'm looking for a suitable life partner for marriage",
    "I would like to explore marriage or personal loan options",
    "I'm looking for a home loan to purchase a property",
    "I need guidance on housing, insurance, and family financial planning",
  ],

  "health-wellness": [
    "I'm looking for healthcare services that meet my needs",
    "I need guidance on preventive healthcare and wellness",
    "I would like to explore home healthcare and physiotherapy services",
    "I'm looking to book diagnostic tests or a comprehensive health checkup",
  ],

  "wealth-security": [
    "I need guidance on savings and investment planning",
    "I would like to explore insurance and pension planning options",
    "I'm looking for assistance with tax, succession, and wealth planning",
    "I want to explore stable-return options and wealth preservation strategies",
  ],

  "ageing-retirement": [
    "I need guidance on retirement and financial planning",
    "I'm looking for senior living and elder care services",
    "I would like to explore second-career opportunities and lifelong learning",
    "I'm looking for home nursing and medical assistance for elderly family members",
  ],

  "legacy-continuity": [
    "I need assistance with wills and succession planning",
    "I would like to preserve family memories, records, and memoirs",
    "I'm looking for guidance on digital legacy and philanthropic planning",
    "I need assistance with protecting and transferring family assets",
  ],
};



export const PLATFORMS: Platform[] = [
  {
    id: "oxyloans",
    name: "OXYLOANS",
    shortName: "OXYLOANS",
    description: "Borrower, lender and partner journeys.",
  },
  {
    id: "oxybricks",
    name: "OXYBRICKS",
    shortName: "OXYBRICKS",
    description: "Property, fractional ownership and real-estate journeys.",
  },
  {
    id: "oxygold",
    name: "OXYGOLD",
    shortName: "OXYGOLD",
    description: "Gold, silver, customer, retail and partner journeys.",
  },
  {
    id: "study-abroad",
    name: "STUDY ABROAD",
    shortName: "STUDY ABROAD",
    description: "Student, university, visa, consultant and finance journeys.",
  },
  {
    id: "askoxy-ai",
    name: "ASKOXY.AI",
    shortName: "ASKOXY.AI",
    description: "AI, business, learning, mentoring and co-founder journeys.",
  },
  {
    id: "jobs-careers",
    name: "JOBS & CAREERS",
    shortName: "JOBS & CAREERS",
    description: "Job seeker, mentor, freelancer, employer, recruiter and training journeys.",
  },
];

export function getLifeStageById(stageId: string) {
  return LIFE_STAGES.find((stage) => stage.id === stageId);
}

export function getPlatformById(platformId: string) {
  return PLATFORMS.find((platform) => platform.id === platformId);
}

/**
 * The top 20 member classifications (from the Rotary directory). `name` is the exact value sent to the
 * backend as the classification; `label` is only what is shown; `field` marks a field/industry rather
 * than a person's role, which changes how the opening message reads.
 */
export type Classification = { name: string; label?: string; icon: string; field?: boolean };

export const TOP_CLASSIFICATIONS: Classification[] = [
  { name: "Proprietor", icon: "🏪" },
  { name: "Business", icon: "💼", field: true },
  { name: "Director", icon: "🧑‍💼" },
  { name: "Doctor", icon: "🩺" },
  { name: "Advocate", icon: "⚖️" },
  { name: "Managing Director", icon: "👔" },
  { name: "Engineer", icon: "🛠️" },
  { name: "Education", icon: "🎓", field: true },
  { name: "Chartered Accountant", icon: "🧮" },
  { name: "Owner", icon: "🏬" },
  { name: "Real Estate", icon: "🏠", field: true },
  { name: "Ceo", label: "CEO", icon: "🌟" },
  { name: "Home Maker", icon: "🏡" },
  { name: "Managing Partner", icon: "🤝" },
  { name: "Civil Engineer", icon: "🏗️" },
  { name: "Builder", icon: "🧱" },
  { name: "Banking", icon: "🏦", field: true },
  { name: "Exporter & Hosiery Mfrs.", icon: "🏭", field: true },
  { name: "Business Owner", icon: "🏢" },
  { name: "President", icon: "🎖️" },
];

export const classificationLabel = (item: Classification) => item.label || item.name;

export function classificationOpeningMessage(item: Classification) {
  const label = classificationLabel(item);
  if (item.field) return `I'm looking for someone in ${label}`;
  return `I'm looking for ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}`;
}
