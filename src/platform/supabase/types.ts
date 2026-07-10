export type LabSessionRow = {
  id: string;
  session_token: string;
  variant_id: string;
  generation: number;
  strategy: string | null;
  experiment_number: number | null;
  converted: boolean;
  bounced: boolean;
  scroll_depth: number;
  total_dwell_ms: number;
  target_token: string | null;
  created_at: string;
  updated_at: string;
};

export type LabEventRow = {
  id: string;
  session_id: string;
  event_type: string;
  section_id: string | null;
  dwell_ms: number | null;
  scroll_depth_pct: number | null;
  at_ms: number | null;
  created_at: string;
};

export type AnalyticsIngestBody = {
  sessionToken: string;
  variantId: string;
  generation?: number;
  strategy?: string;
  experimentNumber?: number;
  challenge?: string;
  targetToken?: string;
  event:
    | "session_start"
    | "section_view"
    | "section_viewed"
    | "scroll_depth"
    | "cta_viewed"
    | "book_demo_click"
    | "cta_click"
    | "$pageleave"
    | "page_exit";
  sectionId?: string;
  ctaLabel?: string;
  scrollDepth?: number;
  scrollDepthPct?: number;
  dwellMs?: number;
  converted?: boolean;
  bounced?: boolean;
  sectionsViewedCount?: number;
  unresolvedObjections?: string[];
};
