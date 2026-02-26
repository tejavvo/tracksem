import { DEFAULT_COURSES } from '$lib/data/courses';
import type { Course, Component, SubItem } from '$lib/types';

const STORAGE_KEY = 'tracksem_grades_v2';

function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function loadFromStorage(): Course[] {
    if (typeof window === 'undefined') return structuredClone(DEFAULT_COURSES);
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_COURSES);
        return JSON.parse(raw);
    } catch (rawErr) {
        return structuredClone(DEFAULT_COURSES);
    }
}

function persist(courses: Course[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
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
            // take top bestOf scores
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

class GradesStore {
    courses = $state<Course[]>([]);

    constructor() {
        this.courses = loadFromStorage();
    }

    getCourse(id: string): Course | undefined {
        return this.courses.find((c) => c.id === id);
    }

    // ─── Direct score (top-level) ───────────────────────────────────────────────

    updateScore(courseId: string, componentId: string, score: number | null): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.score = score;
        persist(this.courses);
    }

    // ─── Sub-item scores ────────────────────────────────────────────────────────

    updateSubScore(courseId: string, componentId: string, subItemId: string, score: number | null): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub) return;
        sub.score = score;
        persist(this.courses);
    }

    updateSubMaxScore(courseId: string, componentId: string, subItemId: string, maxScore: number): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub) return;
        sub.maxScore = maxScore;
        persist(this.courses);
    }

    updateSubName(courseId: string, componentId: string, subItemId: string, name: string): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub) return;
        sub.name = name;
        persist(this.courses);
    }

    addSubItem(courseId: string, componentId: string): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        if (!comp.subItems) comp.subItems = [];
        const n = comp.subItems.length + 1;
        comp.subItems.push({
            id: `${componentId}-${generateId()}`,
            name: `${comp.name} ${n}`,
            score: null,
            maxScore: comp.maxScore
        });
        persist(this.courses);
    }

    removeSubItem(courseId: string, componentId: string, subItemId: string): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp || !comp.subItems) return;
        comp.subItems = comp.subItems.filter((s) => s.id !== subItemId);
        // keep bestOf in bounds
        if (comp.bestOf && comp.bestOf > comp.subItems.length) {
            comp.bestOf = comp.subItems.length || undefined;
        }
        persist(this.courses);
    }

    updateBestOf(courseId: string, componentId: string, bestOf: number | undefined): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.bestOf = bestOf;
        persist(this.courses);
    }

    // ─── Component-level ────────────────────────────────────────────────────────

    updateWeight(courseId: string, componentId: string, weight: number): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.weight = weight;
        persist(this.courses);
    }

    updateMaxScore(courseId: string, componentId: string, maxScore: number): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.maxScore = maxScore;
        persist(this.courses);
    }

    updateName(courseId: string, componentId: string, name: string): void {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return;
        comp.name = name;
        persist(this.courses);
    }

    addComponent(courseId: string): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        course.components.push({
            id: `${courseId}-${generateId()}`,
            name: 'New Component',
            weight: 0,
            maxScore: 100,
            score: null
        });
        persist(this.courses);
    }

    removeComponent(courseId: string, componentId: string): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        course.components = course.components.filter((c) => c.id !== componentId);
        persist(this.courses);
    }

    resetCourse(courseId: string): void {
        const original = DEFAULT_COURSES.find((c) => c.id === courseId);
        if (!original) return;
        const idx = this.courses.findIndex((c) => c.id === courseId);
        if (idx === -1) return;
        this.courses[idx] = structuredClone(original);
        persist(this.courses);
    }

    // ─── Derived computations ───────────────────────────────────────────────────

    /** Projected grade for a course (percentage 0–100, or null if no scores at all) */
    projectedGrade(courseId: string): { grade: number | null; filled: number; total: number } {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return { grade: null, filled: 0, total: 0 };

        let weightedSum = 0;
        let filledWeight = 0;
        let filled = 0;

        for (const comp of course.components) {
            const pct = computeCompPct(comp);
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

    /** Effective percentage (0–100) for a single component including sub-items */
    componentPct(courseId: string, componentId: string): number | null {
        const comp = this.#getComp(courseId, componentId);
        if (!comp) return null;
        return computeCompPct(comp);
    }

    totalWeight(courseId: string): number {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return 0;
        return course.components.reduce((sum, c) => sum + c.weight, 0);
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
