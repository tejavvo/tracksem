import type { Course, Component, SubItem } from '$lib/types';

function generateId(): string {
    return crypto.randomUUID();
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

/** Fire-and-forget API helper */
async function api(path: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
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
        const created = (await api('/api/courses', 'POST', { name, fullName, color })) as Course;
        this.courses = [...this.courses, created];
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
        if (!comp) return;
        comp.score = score;
        api('/api/components', 'PATCH', { id: componentId, field: 'score', value: score });
    }

    // ─── Sub-item scores ────────────────────────────────────────────────────────

    updateSubScore(courseId: string, componentId: string, subItemId: string, score: number | null): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub) return;
        sub.score = score;
        api('/api/sub-items', 'PATCH', { id: subItemId, field: 'score', value: score });
    }

    updateSubMaxScore(courseId: string, componentId: string, subItemId: string, maxScore: number): void {
        const sub = this.#getSub(courseId, componentId, subItemId);
        if (!sub) return;
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
        if (!comp) return;
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

    // ─── Derived computations ───────────────────────────────────────────────────

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
