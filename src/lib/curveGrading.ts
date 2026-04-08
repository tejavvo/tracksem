/**
 * Curve-based grade prediction using a normal distribution model.
 *
 * The class average (or median when available) anchors the 50th percentile.
 * A student's score is converted to a z-score, then to a percentile via
 * the standard normal CDF, and finally mapped to a letter grade.
 */

// ── Standard normal CDF (Abramowitz & Stegun approximation) ──────────────────

function normalCdf(z: number): number {
    if (z < -6) return 0;
    if (z > 6) return 1;

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.SQRT2;
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a raw score to a percentile (0–100) given the distribution center and σ */
export function scoreToPercentile(score: number, center: number, stdDev: number): number {
    if (stdDev <= 0) return score >= center ? 99 : 1;
    const z = (score - center) / stdDev;
    return normalCdf(z) * 100;
}

/**
 * Auto-estimate σ from available class stats.
 *
 * Priority:
 *  1. If classMax and classAvg are given: assume max ≈ mean + 2σ  →  σ = (max - avg) / 2
 *  2. Fallback: σ = maxScore × 0.12
 */
export function estimateStdDev(
    avg: number,
    classMax: number | null | undefined,
    maxScore: number,
): number {
    if (classMax != null && classMax > avg) {
        const est = (classMax - avg) / 2;
        if (est > 0) return est;
    }
    return maxScore * 0.12;
}

// ── Percentile → Letter grade ────────────────────────────────────────────────

export type CurvedLetter = 'A' | 'A-' | 'B' | 'B-' | 'C' | 'C-' | 'D' | 'F';

export function percentileToGrade(percentile: number): CurvedLetter {
    if (percentile >= 90) return 'A';
    if (percentile >= 80) return 'A-';
    if (percentile >= 65) return 'B';
    if (percentile >= 50) return 'B-';
    if (percentile >= 35) return 'C';
    if (percentile >= 20) return 'C-';
    if (percentile >= 10) return 'D';
    return 'F';
}

// ── Color for curved letter grades ───────────────────────────────────────────

const CURVED_GRADE_COLORS: Record<CurvedLetter, string> = {
    'A':  '#4ade80',
    'A-': '#86efac',
    'B':  '#60a5fa',
    'B-': '#93c5fd',
    'C':  '#fbbf24',
    'C-': '#fcd34d',
    'D':  '#fb923c',
    'F':  '#f87171',
};

export function getCurvedGradeColor(letter: CurvedLetter): string {
    return CURVED_GRADE_COLORS[letter] ?? '#6b7280';
}

// ── High-level prediction ────────────────────────────────────────────────────

export interface PredictedGrade {
    percentile: number;
    letter: CurvedLetter;
    color: string;
}

/**
 * Predict a letter grade for a student score given class statistics.
 *
 * @param score     - the student's raw score
 * @param maxScore  - maximum possible score for the component
 * @param classAvg  - class average (required to predict)
 * @param opts      - optional: median, max, stdDev
 */
export function predictGrade(
    score: number,
    maxScore: number,
    classAvg: number,
    opts?: {
        median?: number | null;
        max?: number | null;
        stdDev?: number | null;
    },
): PredictedGrade {
    // Use median as center if available (better for skewed distributions),
    // otherwise fall back to the class average
    const center = opts?.median ?? classAvg;

    // Get σ: use explicit value, or estimate from available stats
    const stdDev = (opts?.stdDev != null && opts.stdDev > 0)
        ? opts.stdDev
        : estimateStdDev(classAvg, opts?.max, maxScore);

    const percentile = scoreToPercentile(score, center, stdDev);
    const letter = percentileToGrade(percentile);
    const color = getCurvedGradeColor(letter);

    return { percentile, letter, color };
}
