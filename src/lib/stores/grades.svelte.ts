import type { Course, Component, SubItem } from '$lib/types';
import { toast } from 'svelte-sonner';
import { predictGrade, percentileToGrade, getCurvedGradeColor, estimateStdDev, scoreToPercentile } from '$lib/curveGrading';

function generateId(): string {
    return crypto.randomUUID();
}

function getComponentPercentile(course: Course, comp: Component): number | null {
    if (comp.statsMode === 'per-sub' && comp.subItems && comp.subItems.length > 0) {
        const subPreds: number[] = [];
        for (const sub of comp.subItems) {
            if (sub.scaleTargetId) {
                const targetPercentile = getScaleTargetPercentile(course, sub.scaleTargetId);
                if (targetPercentile !== null) subPreds.push(targetPercentile);
                continue;
            }

            if (sub.score === null || sub.classAvg == null) continue;
            const pred = predictGrade(sub.score, sub.maxScore, sub.classAvg, {
                median: sub.classMedian,
                max: sub.classMax,
                stdDev: sub.classStdDev,
            });
            subPreds.push(pred.percentile);
        }

        if (subPreds.length === 0) return null;
        return subPreds.reduce((a, b) => a + b, 0) / subPreds.length;
    }

    const pct = computeEffectiveCompPct(course, comp);
    if (pct === null || comp.classAvg == null) return null;

    const score = (pct / 100) * comp.maxScore;
    const pred = predictGrade(score, comp.maxScore, comp.classAvg, {
        median: comp.classMedian,
        max: comp.classMax,
        stdDev: comp.classStdDev,
    });

    return pred.percentile;
}

function getScaleTargetPercentile(course: Course, targetId: string | null | undefined): number | null {
    if (!targetId) return null;

    for (const comp of course.components) {
        if (comp.id === targetId) return getComponentPercentile(course, comp);

        const sub = comp.subItems?.find((item) => item.id === targetId);
        if (sub) {
            if (sub.scaleTargetId) return getScaleTargetPercentile(course, sub.scaleTargetId);
            if (sub.score === null || sub.classAvg == null) return null;
            const pred = predictGrade(sub.score, sub.maxScore, sub.classAvg, {
                median: sub.classMedian,
                max: sub.classMax,
                stdDev: sub.classStdDev,
            });
            return pred.percentile;
        }
    }

    return null;
}

/**
 * Compute the effective percentage (0–100) for a component.
 * - If subItems exist: average of filled scores (best-of if bestOf set)
 * - Otherwise: score / maxScore * 100
 */
export function computeCompPct(comp: Component): number | null {
    if (comp.subItems && comp.subItems.length > 0) {
        const filled = comp.subItems
            .filter((s) => s.score !== null)
            .map((s) => ({ pct: (s.score! / s.maxScore) * 100 }));

        if (filled.length === 0) return null;

        if (comp.bestOf && comp.bestOf < filled.length) {
            const top = filled
                .map((f) => f.pct)
                .sort((a, b) => b - a)
                .slice(0, comp.bestOf);
            return top.reduce((a, b) => a + b, 0) / top.length;
        }

        const avg = filled.reduce((sum, f) => sum + f.pct, 0) / filled.length;
        return avg;
    }

    if (comp.score === null) return null;
    return (comp.score / comp.maxScore) * 100;
}

export function computeSubPct(sub: SubItem): number | null {
    if (sub.score === null) return null;
    return (sub.score / sub.maxScore) * 100;
}

export function computeEffectiveSubPct(course: Course, sub: SubItem): number | null {
    return sub.scaleTargetId ? getScaleTargetPct(course, sub.scaleTargetId) : computeSubPct(sub);
}

export function computeEffectiveCompPct(course: Course, comp: Component): number | null {
    if (comp.scaleTargetId) return getScaleTargetPct(course, comp.scaleTargetId);

    if (comp.subItems && comp.subItems.length > 0) {
        const filled = comp.subItems
            .map((sub) => computeEffectiveSubPct(course, sub))
            .filter((pct): pct is number => pct !== null);

        if (filled.length === 0) return null;

        if (comp.bestOf && comp.bestOf < filled.length) {
            const top = filled.sort((a, b) => b - a).slice(0, comp.bestOf);
            return top.reduce((a, b) => a + b, 0) / top.length;
        }

        return filled.reduce((sum, pct) => sum + pct, 0) / filled.length;
    }

    return computeCompPct(comp);
}

export function getScaleTargetPct(course: Course, targetId: string | null | undefined): number | null {
    if (!targetId) return null;

    for (const comp of course.components) {
        if (comp.id === targetId) return computeEffectiveCompPct(course, comp);

        const sub = comp.subItems?.find((item) => item.id === targetId);
        if (sub) return computeEffectiveSubPct(course, sub);
    }

    return null;
}

export function effectiveComponentWeight(course: Course, componentId: string): number {
    const comp = course.components.find((item) => item.id === componentId);
    if (!comp || comp.scaleTargetId) return 0;

    return course.components.reduce(
        (sum, item) => sum + (item.scaleTargetId === componentId ? item.weight : 0),
        comp.weight
    );
}

// ─── Course totals (gained / max possible) ───────────────────────────────────

type PctRange = { lo: number; hi: number };

function findItem(course: Course, id: string): Component | SubItem | null {
    for (const comp of course.components) {
        if (comp.id === id) return comp;
        const sub = comp.subItems?.find((item) => item.id === id);
        if (sub) return sub;
    }
    return null;
}

/** Average of the best `k` values. */
function bestAvg(values: number[], k: number): number {
    const top = [...values].sort((a, b) => b - a).slice(0, k);
    return top.reduce((a, b) => a + b, 0) / top.length;
}

/**
 * Range (0–100) a component or sub-item can still end up at:
 * `lo` treats everything ungraded as 0, `hi` treats it as full marks.
 */
function itemPctRange(course: Course, item: Component | SubItem, seen: Set<string> = new Set()): PctRange {
    if (seen.has(item.id)) return { lo: 0, hi: 100 };
    seen.add(item.id);

    if (item.scaleTargetId) {
        const target = findItem(course, item.scaleTargetId);
        return target ? itemPctRange(course, target, seen) : { lo: 0, hi: 100 };
    }

    if ('subItems' in item && item.subItems && item.subItems.length > 0) {
        const ranges = item.subItems.map((sub) => itemPctRange(course, sub, new Set(seen)));
        const n = ranges.length;
        const k = item.bestOf && item.bestOf < n ? item.bestOf : n;
        return { lo: bestAvg(ranges.map((r) => r.lo), k), hi: bestAvg(ranges.map((r) => r.hi), k) };
    }

    if (item.score === null) return { lo: 0, hi: 100 };
    const pct = (item.score / item.maxScore) * 100;
    return { lo: pct, hi: pct };
}

export type CourseTotals = {
    /** Course points already locked in (ungraded work counted as 0). */
    gained: number;
    /** Course points reachable if every ungraded item gets full marks. */
    maxPossible: number;
    /** Course points already assessed, i.e. no longer at stake (totalWeight − open points). */
    graded: number;
    /** Sum of component weights (normally 100). */
    totalWeight: number;
};

export function computeCourseTotals(course: Course): CourseTotals {
    let gained = 0;
    let maxPossible = 0;
    let graded = 0;
    let totalWeight = 0;
    for (const comp of course.components) {
        const { lo, hi } = itemPctRange(course, comp);
        gained += (lo * comp.weight) / 100;
        maxPossible += (hi * comp.weight) / 100;
        graded += Math.max(0, comp.weight * (1 - (hi - lo) / 100));
        totalWeight += comp.weight;
    }
    return { gained, maxPossible, graded, totalWeight };
}

// ─── Class distribution of course totals ─────────────────────────────────────

type PctStats = { mean: number; sd: number };

/** Class mean and σ for an item, expressed in percent of its max score. */
function itemClassStats(course: Course, item: Component | SubItem, seen: Set<string> = new Set()): PctStats | null {
    if (seen.has(item.id)) return null;
    seen.add(item.id);

    if (item.scaleTargetId) {
        const target = findItem(course, item.scaleTargetId);
        return target ? itemClassStats(course, target, seen) : null;
    }

    if ('subItems' in item && item.statsMode === 'per-sub' && item.subItems && item.subItems.length > 0) {
        const stats = item.subItems
            .map((sub) => itemClassStats(course, sub, new Set(seen)))
            .filter((st): st is PctStats => st !== null);
        if (stats.length === 0) return null;
        const m = stats.length;
        return {
            mean: stats.reduce((a, st) => a + st.mean, 0) / m,
            sd: Math.sqrt(stats.reduce((a, st) => a + st.sd ** 2, 0)) / m,
        };
    }

    if (item.classAvg == null || item.maxScore <= 0) return null;
    const sd = item.classStdDev != null && item.classStdDev > 0
        ? item.classStdDev
        : estimateStdDev(item.classAvg, item.classMax, item.maxScore);
    return { mean: (item.classAvg / item.maxScore) * 100, sd: (sd / item.maxScore) * 100 };
}

export type ClassTotalDistribution = {
    /** Expected class total, in course points over the covered components. */
    mean: number;
    sd: number;
    /** Your course points over the same components. */
    yours: number;
    /** Weight (course points) covered by components with both class stats and your score. */
    coveredWeight: number;
    coveredCount: number;
    /** Share of the class estimated to be at or below your total (0–100). */
    percentile: number;
};

/**
 * Normal approximation of the class's course totals, built only from components
 * that have class statistics and your score. Component scores are assumed
 * independent, so means and variances add.
 */
export function computeClassTotalDistribution(course: Course): ClassTotalDistribution | null {
    let mean = 0;
    let variance = 0;
    let yours = 0;
    let coveredWeight = 0;
    let coveredCount = 0;

    for (const comp of course.components) {
        const stats = itemClassStats(course, comp);
        const pct = computeEffectiveCompPct(course, comp);
        if (!stats || pct === null) continue;
        const w = comp.weight / 100;
        mean += stats.mean * w;
        variance += (stats.sd * w) ** 2;
        yours += pct * w;
        coveredWeight += comp.weight;
        coveredCount++;
    }

    if (coveredCount === 0) return null;
    const sd = Math.sqrt(variance);
    return { mean, sd, yours, coveredWeight, coveredCount, percentile: scoreToPercentile(yours, mean, sd) };
}

/** Fire-and-forget API helper */
async function api(path: string, method: string, body?: unknown): Promise<unknown> {
    try {
        const res = await fetch(path, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`);
        return await res.json();
    } catch (err) {
        console.error(err);
        toast.error("Couldn't save your change", { description: 'Reload the page to see what was saved.' });
        return null;
    }
}

class GradesStore {
    courses = $state<Course[]>([]);
    loaded = $state(false);

    /** Clear all state — call on sign-out so the next user starts fresh */
    reset(): void {
        this.courses = [];
        this.loaded = false;
    }

    /** Load all courses from the API */
    async load(): Promise<void> {
        if (this.loaded) return;
        const res = await fetch('/api/courses');
        this.courses = await res.json();
        this.loaded = true;
    }

    /** Force reload from DB */
    async reload(): Promise<void> {
        const res = await fetch('/api/courses');
        this.courses = await res.json();
    }

    /** Add a new course with default components */
    async addCourse(name: string, fullName: string, color: string): Promise<void> {
        const created = (await api('/api/courses', 'POST', { name, fullName, color })) as Course | null;
        if (created) this.courses = [...this.courses, created];
    }

    /** Seed courses from the catalog for a given branch + semester */
    async seedFromCatalog(branch: string, semester: string): Promise<void> {
        const res = await fetch('/api/courses/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch, semester })
        });
        this.courses = await res.json();
    }

    /** Delete a course */
    async deleteCourse(courseId: string): Promise<void> {
        await api('/api/courses', 'DELETE', { id: courseId });
        this.courses = this.courses.filter((c) => c.id !== courseId);
    }

    getCourse(id: string): Course | undefined {
        return this.courses.find((c) => c.id === id);
    }

    // ─── Direct score (top-level) ───────────────────────────────────────────────

    updateScore(courseId: string, componentId: string, score: number | null): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp || comp.scaleTargetId) return;
        comp.score = score;
        api('/api/components', 'PATCH', { id: componentId, field: 'score', value: score });
    }

    // ─── Sub-item scores ────────────────────────────────────────────────────────

    updateSubScore(courseId: string, componentId: string, subItemId: string, score: number | null): void {
        const comp = this.#getComp(courseId, componentId);
        if (comp?.scaleTargetId) return;
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub || sub.scaleTargetId) return;
        sub.score = score;
        api('/api/sub-items', 'PATCH', { id: subItemId, field: 'score', value: score });
    }

    updateSubMaxScore(courseId: string, componentId: string, subItemId: string, maxScore: number): void {
        const comp = this.#getComp(courseId, componentId);
        if (comp?.scaleTargetId) return;
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub || sub.scaleTargetId) return;
        sub.maxScore = maxScore;
        api('/api/sub-items', 'PATCH', { id: subItemId, field: 'maxScore', value: maxScore });
    }

    updateSubName(courseId: string, componentId: string, subItemId: string, name: string): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub) return;
        sub.name = name;
        api('/api/sub-items', 'PATCH', { id: subItemId, field: 'name', value: name });
    }

    addSubItem(courseId: string, componentId: string): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        if (!comp.subItems) comp.subItems = [];
        const n = comp.subItems.length + 1;
        const id = `${componentId}-${generateId()}`;
        const name = `${comp.name} ${n}`;
        comp.subItems.push({ id, name, score: null, maxScore: comp.maxScore });
        api('/api/sub-items', 'POST', { componentId, id, name, maxScore: comp.maxScore });
    }

    removeSubItem(courseId: string, componentId: string, subItemId: string): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp || !comp.subItems) return;
        comp.subItems = comp.subItems.filter((s) => s.id !== subItemId);
        if (comp.bestOf && comp.bestOf > comp.subItems.length) {
            comp.bestOf = comp.subItems.length || undefined;
            api('/api/components', 'PATCH', { id: componentId, field: 'bestOf', value: comp.bestOf });
        }
        api('/api/sub-items', 'DELETE', { id: subItemId, componentId });
    }

    updateBestOf(courseId: string, componentId: string, bestOf: number | undefined): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.bestOf = bestOf;
        api('/api/components', 'PATCH', { id: componentId, field: 'bestOf', value: bestOf });
    }

    // ─── Component-level ────────────────────────────────────────────────────────

    updateWeight(courseId: string, componentId: string, weight: number): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.weight = weight;
        api('/api/components', 'PATCH', { id: componentId, field: 'weight', value: weight });
    }

    updateMaxScore(courseId: string, componentId: string, maxScore: number): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp || comp.scaleTargetId) return;
        comp.maxScore = maxScore;
        api('/api/components', 'PATCH', { id: componentId, field: 'maxScore', value: maxScore });
    }

    updateName(courseId: string, componentId: string, name: string): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.name = name;
        api('/api/components', 'PATCH', { id: componentId, field: 'name', value: name });
    }

    addComponent(courseId: string): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        const id = `${courseId}-${generateId()}`;
        const name = 'New Component';
        course.components.push({ id, name, weight: 0, maxScore: 100, score: null });
        api('/api/components', 'POST', { courseId, id, name });
    }

    removeComponent(courseId: string, componentId: string): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        course.components = course.components.filter((c) => c.id !== componentId);
        api('/api/components', 'DELETE', { id: componentId });
    }

    async resetCourse(courseId: string): Promise<void> {
        await api(`/api/courses/${courseId}/reset`, 'POST');
        await this.reload();
    }

    // ─── Class stats ────────────────────────────────────────────────────────────

    updateClassStats(courseId: string, componentId: string, field: 'classAvg' | 'classMedian' | 'classMax' | 'classStdDev', value: number | null): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp || comp.scaleTargetId) return;
        comp[field] = value;
        api('/api/components', 'PATCH', { id: componentId, field, value });
    }

    updateStatsMode(courseId: string, componentId: string, mode: 'global' | 'per-sub'): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.statsMode = mode;
        api('/api/components', 'PATCH', { id: componentId, field: 'statsMode', value: mode });
    }

    updateScaleTarget(courseId: string, componentId: string, targetId: string | null): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.scaleTargetId = targetId;
        api('/api/components', 'PATCH', { id: componentId, field: 'scaleTargetId', value: targetId });
    }

    updateSubClassStats(courseId: string, componentId: string, subItemId: string, field: 'classAvg' | 'classMedian' | 'classMax' | 'classStdDev', value: number | null): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub || sub.scaleTargetId) return;
        sub[field] = value;
        api('/api/sub-items', 'PATCH', { id: subItemId, field, value });
    }

    updateSubScaleTarget(courseId: string, componentId: string, subItemId: string, targetId: string | null): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub) return;
        sub.scaleTargetId = targetId;
        api('/api/sub-items', 'PATCH', { id: subItemId, field: 'scaleTargetId', value: targetId });
    }

    // ─── Derived computations ───────────────────────────────────────────────────

    projectedGrade(courseId: string): { grade: number | null; filled: number; total: number } {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return { grade: null, filled: 0, total: 0 };

        let weightedSum = 0;
        let filledWeight = 0;
        let filled = 0;

        for (const comp of course.components) {
            const pct = computeEffectiveCompPct(course, comp);
            if (pct !== null) {
                weightedSum += pct * (comp.weight / 100);
                filledWeight += comp.weight;
                filled++;
            }
        }

        if (filledWeight === 0) return { grade: null, filled: 0, total: course.components.length };
        const grade = (weightedSum / filledWeight) * 100;
        return { grade, filled, total: course.components.length };
    }

    componentPct(courseId: string, componentId: string): number | null {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return null;
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return null;
        return computeEffectiveCompPct(course, comp);
    }

    totalWeight(courseId: string): number {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return 0;
        return course.components.reduce((sum, c) => sum + c.weight, 0);
    }

    /** Compute an overall curved grade across components that have both a score AND class stats */
    curvedGrade(courseId: string): { letter: string; color: string; percentile: number } | null {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return null;

        let weightedPercentile = 0;
        let filledWeight = 0;

        for (const comp of course.components) {
            if (comp.scaleTargetId) {
                const targetPercentile = getScaleTargetPercentile(course, comp.scaleTargetId);
                if (targetPercentile === null) continue;

                weightedPercentile += targetPercentile * (comp.weight / 100);
                filledWeight += comp.weight;
                continue;
            }

            const percentile = getComponentPercentile(course, comp);
            if (percentile === null) continue;

            weightedPercentile += percentile * (comp.weight / 100);
            filledWeight += comp.weight;
        }

        if (filledWeight === 0) return null;

        const overallPercentile = (weightedPercentile / filledWeight) * 100;

        const letter = percentileToGrade(overallPercentile);
        const color = getCurvedGradeColor(letter);

        return { letter, color, percentile: overallPercentile };
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    #getComp(courseId: string, componentId: string): Component | undefined {
        return this.courses.find((c) => c.id === courseId)?.components.find((c) => c.id === componentId);
    }

    #getSub(courseId: string, componentId: string, subItemId: string): SubItem | undefined {
        return this.#getComp(courseId, componentId)?.subItems?.find((s) => s.id === subItemId);
    }
}

export const grades = new GradesStore();
