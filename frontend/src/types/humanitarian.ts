// TypeScript types for humanitarian activity data
// IATI Standard: https://iatistandard.org/en/guidance/standard-guidance/humanitarian/

export interface HumanitarianScopeNarrative {
  id?: string;
  humanitarian_scope_id?: string;
  language: string;
  narrative: string;
  created_at?: string;
}

export interface HumanitarianScope {
  id?: string;
  activity_id?: string;
  type: '1' | '2'; // 1=Emergency, 2=Appeal
  vocabulary: string; // 1-2=GLIDE, 2-1=HRP, 99=Custom
  code: string;
  vocabulary_uri?: string;
  narratives: HumanitarianScopeNarrative[];
  created_at?: string;
  updated_at?: string;
}

export interface HumanitarianData {
  humanitarian: boolean;
  humanitarian_scopes: HumanitarianScope[];
}

