export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string; // company id
  role?: string;
  custom?: Record<string, string>;
  created: string;
  updated: string;
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  custom?: Record<string, string>;
  created: string;
  updated: string;
}

export type DealStage = string;

export interface Deal {
  id: string;
  title: string;
  company?: string; // company id
  contacts: string[]; // contact ids
  stage: DealStage;
  value?: number;
  currency?: string;
  probability?: number;
  closeDate?: string;
  custom?: Record<string, string>;
  created: string;
  updated: string;
}

export type ActivityType = "call" | "email" | "meeting" | "note";

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  body?: string;
  contact?: string; // contact id
  deal?: string; // deal id
  company?: string; // company id
  date: string;
  created: string;
  updated: string;
}

export interface Task {
  id: string;
  title: string;
  contact?: string; // contact id
  deal?: string; // deal id
  company?: string; // company id
  due?: string;
  done: boolean;
  created: string;
  updated: string;
}

export interface Config {
  stages: string[];
  currency: string;
}

export const DEFAULT_CONFIG: Config = {
  stages: [
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "closed-won",
    "closed-lost",
  ],
  currency: "USD",
};
