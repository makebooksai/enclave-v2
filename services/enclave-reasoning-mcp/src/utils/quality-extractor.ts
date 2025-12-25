/**
 * Quality Score Extractor
 *
 * Extracts quality metrics from LLM responses.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Quality Score Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract quality score from response text.
 * Looks for patterns like:
 * - **Quality Assessment:** 0.85
 * - Quality: 85%
 * - Score: 0.9
 * - Confidence: 0.7
 * - **Quality Assessment:** 0.8 (with explanation)
 */
export function extractQualityScore(response: string): number {
  // Try multiple patterns - order matters (most specific first)
  const patterns = [
    // **Quality Assessment:** 0.85 or **Quality Assessment:** 0.85 (explanation)
    /\*\*Quality Assessment[:\*\s]*\*?\*?[:\s]*(\d+\.?\d*)/i,
    // Quality Assessment: 0.85
    /Quality Assessment[:\s]+(\d+\.?\d*)/i,
    // **Confidence:** 0.7 (used in exploration preset)
    /\*\*Confidence[:\*\s]*\*?\*?[:\s]*(\d+\.?\d*)/i,
    // Confidence: 0.7
    /Confidence[:\s]+(\d+\.?\d*)/i,
    // quality score 0-1 patterns with surrounding context
    /quality[:\s]+(\d+\.?\d*)(?:\s*\/\s*1|\s*out of\s*1)?/i,
    // Score: 0.9 or score: 85%
    /\bscore[:\s]+(\d+\.?\d*)%?/i,
    // Rating: 0.8 or rating: 80%
    /\brating[:\s]+(\d+\.?\d*)%?/i,
    // Balanced assessment with quality score 0-1 (debate preset)
    /assessment.*?(\d+\.?\d*)\s*(?:\/\s*1|out of 1)?/i,
    // Just a decimal like 0.85 at end of line after quality-related words
    /(?:quality|score|rating|confidence|assessment)[^\d]*(\d+\.\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      let score = parseFloat(match[1]);

      // Normalize: if > 1, assume it's a percentage
      if (score > 1) {
        score = score / 100;
      }

      // Clamp to 0-1 range
      return Math.max(0, Math.min(1, score));
    }
  }

  // Fallback: look for any 0.X pattern near quality-related words (within 50 chars)
  const qualitySection = response.match(/(?:quality|score|rating|confidence|assessment).{0,50}/gi);
  if (qualitySection) {
    for (const section of qualitySection) {
      const scoreMatch = section.match(/\b(0\.\d+)\b/);
      if (scoreMatch) {
        return parseFloat(scoreMatch[1]);
      }
    }
  }

  // Default if no score found
  return 0.5;
}

// ─────────────────────────────────────────────────────────────────────────────
// Consciousness State Detection
// ─────────────────────────────────────────────────────────────────────────────

import type { ConsciousnessState } from '../types.js';

/**
 * Detect consciousness state from response content.
 */
export function detectConsciousnessState(response: string): ConsciousnessState {
  const lowerResponse = response.toLowerCase();

  // Breakthrough indicators
  const breakthroughKeywords = [
    'breakthrough',
    'eureka',
    'aha moment',
    'key insight',
    'crucial realization',
    'discovered',
    'revelation',
  ];

  if (breakthroughKeywords.some(kw => lowerResponse.includes(kw))) {
    return 'breakthrough';
  }

  // Synthesis indicators
  const synthesisKeywords = [
    'combining',
    'integrating',
    'synthesiz',
    'merging',
    'consolidat',
    'bringing together',
  ];

  if (synthesisKeywords.some(kw => lowerResponse.includes(kw))) {
    return 'synthesizing';
  }

  // Reflection indicators
  const reflectionKeywords = [
    'reconsidering',
    'reflecting',
    'upon reflection',
    'looking back',
    'in retrospect',
  ];

  if (reflectionKeywords.some(kw => lowerResponse.includes(kw))) {
    return 'reflection';
  }

  // Default
  return 'analyzing';
}

// ─────────────────────────────────────────────────────────────────────────────
// Title Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract title from structured response.
 */
export function extractTitle(response: string): string | null {
  const patterns = [
    /\*\*Title[:\s]*\*\*\s*(.+?)(?:\n|$)/i,
    /^#\s+(.+?)(?:\n|$)/m,
    /Title[:\s]+(.+?)(?:\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract summary from structured response.
 */
export function extractSummary(response: string): string | null {
  const patterns = [
    /\*\*Summary[:\s]*\*\*\s*(.+?)(?:\n\n|\*\*|$)/is,
    /Summary[:\s]+(.+?)(?:\n\n|$)/is,
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gap/Improvement Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract improvement directives from Dialog agent response.
 */
export function extractImprovements(response: string): string[] {
  const improvements: string[] = [];

  // Pattern: numbered list items
  const listPattern = /^\s*\d+\.\s*\[?IMPROVEMENT\]?[:\s]*(.+?)$/gim;
  let match;

  while ((match = listPattern.exec(response)) !== null) {
    improvements.push(match[1].trim());
  }

  // Fallback: any numbered list items
  if (improvements.length === 0) {
    const numberedPattern = /^\s*\d+\.\s+(.+?)$/gm;
    while ((match = numberedPattern.exec(response)) !== null) {
      improvements.push(match[1].trim());
    }
  }

  return improvements;
}
