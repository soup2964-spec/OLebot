export type LabSessionRow = {
  id: string;
  session_token: string;
  variant_id: string;
  generation: number;
  strategy: string | null;
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
  targetToken?: string;
  event:
    | "session_start"
    | "section_view"
    | "scroll_depth"
    | "cta_click"
    | "page_exit";
  sectionId?: string;
  scrollDepth?: number;
  scrollDepthPct?: number;
  dwellMs?: number;
  converted?: boolean;
  bounced?: boolean;
};
