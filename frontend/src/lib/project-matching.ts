import { Project, ProjectMatch } from '@/types/project';

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity score between 0 and 1
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLen);
}

// Check if two date ranges overlap
function dateRangesOverlap(
  start1?: string, 
  end1?: string, 
  start2?: string, 
  end2?: string
): boolean {
  if (!start1 || !start2) return false;
  
  const s1 = new Date(start1);
  const s2 = new Date(start2);
  const e1 = end1 ? new Date(end1) : new Date('2099-12-31');
  const e2 = end2 ? new Date(end2) : new Date('2099-12-31');
  
  return s1 <= e2 && s2 <= e1;
}

// Check location overlap
function locationsOverlap(locations1?: any[], locations2?: any[]): boolean {
  if (!locations1?.length || !locations2?.length) return false;
  
  return locations1.some(loc1 => 
    locations2.some(loc2 => 
      loc1.name?.toLowerCase() === loc2.name?.toLowerCase() ||
      (loc1.latitude && loc2.latitude && 
       Math.abs(loc1.latitude - loc2.latitude) < 0.01 &&
       Math.abs(loc1.longitude - loc2.longitude) < 0.01)
    )
  );
}

// Find similar projects using fuzzy matching
export function findSimilarProjects(
  newProject: Partial<Project>,
  existingProjects: Project[],
  threshold: number = 0.6
): ProjectMatch[] {
  const matches: ProjectMatch[] = [];

  for (const existingProject of existingProjects) {
    const matchReasons: string[] = [];
    let totalScore = 0;
    let factorCount = 0;

    // Title similarity (weight: 40%)
    if (newProject.title && existingProject.title) {
      const titleScore = stringSimilarity(newProject.title, existingProject.title);
      if (titleScore > 0.7) {
        matchReasons.push(`Similar title (${Math.round(titleScore * 100)}% match)`);
      }
      totalScore += titleScore * 0.4;
      factorCount += 0.4;
    }

    // Description similarity (weight: 20%)
    if (newProject.description && existingProject.description) {
      const descScore = stringSimilarity(newProject.description, existingProject.description);
      if (descScore > 0.6) {
        matchReasons.push(`Similar description (${Math.round(descScore * 100)}% match)`);
      }
      totalScore += descScore * 0.2;
      factorCount += 0.2;
    }

    // Date overlap (weight: 20%)
    if (dateRangesOverlap(
      newProject.plannedStartDate,
      newProject.plannedEndDate,
      existingProject.plannedStartDate,
      existingProject.plannedEndDate
    )) {
      matchReasons.push('Overlapping timeframe');
      totalScore += 0.2;
      factorCount += 0.2;
    }

    // Location overlap (weight: 20%)
    if (locationsOverlap(newProject.locations, existingProject.locations)) {
      matchReasons.push('Same location(s)');
      totalScore += 0.2;
      factorCount += 0.2;
    }

    // Normalize score
    const normalizedScore = factorCount > 0 ? totalScore / factorCount : 0;

    if (normalizedScore >= threshold && matchReasons.length > 0) {
      matches.push({
        project: existingProject,
        score: normalizedScore,
        matchReasons
      });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

// Check if a project title already exists (exact match)
export function projectTitleExists(
  title: string,
  existingProjects: Project[],
  excludeProjectId?: string
): boolean {
  const normalizedTitle = title.toLowerCase().trim();
  return existingProjects.some(p => 
    p.id !== excludeProjectId &&
    p.title.toLowerCase().trim() === normalizedTitle
  );
}

// Generate suggestions for similar project titles
export function generateTitleSuggestions(
  baseTitle: string,
  existingProjects: Project[]
): string[] {
  const suggestions: string[] = [];
  const baseWords = baseTitle.toLowerCase().split(/\s+/);
  
  // Find projects with similar words
  for (const project of existingProjects) {
    const projectWords = project.title.toLowerCase().split(/\s+/);
    const commonWords = baseWords.filter(w => projectWords.includes(w));
    
    if (commonWords.length >= Math.min(2, baseWords.length * 0.5)) {
      suggestions.push(project.title);
    }
  }
  
  return suggestions.slice(0, 5); // Return top 5 suggestions
} 