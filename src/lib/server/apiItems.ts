import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course, Component, SubItem } from '$lib/types';
import { fetchAllCourses, updateComponentField, updateSubItemField } from '$lib/server/db';
import { computeEffectiveCompPct, computeCourseTotals } from '$lib/stores/grades.svelte';

export type ItemRef =
    | { kind: 'component'; course: Course; comp: Component }
    | { kind: 'sub_item'; course: Course; comp: Component; sub: SubItem };

/** The token owner's courses plus an id → item index. Everything is scoped to `userId`. */
export async function loadOwned(supabase: SupabaseClient, userId: string) {
    const courses = await fetchAllCourses(supabase, userId);
    const items = new Map<string, ItemRef>();
    const courseIds = new Set<string>();
    for (const course of courses) {
        courseIds.add(course.id);
        for (const comp of course.components) {
            items.set(comp.id, { kind: 'component', course, comp });
            for (const sub of comp.subItems ?? []) items.set(sub.id, { kind: 'sub_item', course, comp, sub });
        }
    }
    return { courses, items, courseIds };
}

/** Course summary in percent of the course, for API responses. */
export function summarize(course: Course) {
    const totals = computeCourseTotals(course);
    const w = totals.totalWeight || 100;
    let weighted = 0;
    let gradedWeight = 0;
    for (const comp of course.components) {
        const pct = computeEffectiveCompPct(course, comp);
        if (pct === null) continue;
        weighted += pct * comp.weight;
        gradedWeight += comp.weight;
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
        totalWeight: totals.totalWeight,
        projectedPct: gradedWeight > 0 ? round(weighted / gradedWeight) : null,
        gainedPct: round((totals.gained / w) * 100),
        gradedPct: round((totals.graded / w) * 100),
        maxPossiblePct: round((totals.maxPossible / w) * 100),
    };
}

const NUM_NULLABLE = new Set(['score', 'classAvg', 'classMedian', 'classMax', 'classStdDev']);
const COMPONENT_FIELDS = new Set(['name', 'weight', 'maxScore', 'bestOf', 'statsMode', 'scaleTargetId', ...NUM_NULLABLE]);
const SUB_FIELDS = new Set(['name', 'maxScore', 'scaleTargetId', ...NUM_NULLABLE]);

export type Update = { id: string; field: string; value: unknown };
export type UpdateResult = { id: string; field: string; ok: boolean; error?: string };

/** Validate one update against the owner's items. Returns an error message or null. */
function validate(u: Update, ref: ItemRef | undefined, items: Map<string, ItemRef>): string | null {
    if (!ref) return 'Unknown id (not one of your components or sub-items).';
    const allowed = ref.kind === 'component' ? COMPONENT_FIELDS : SUB_FIELDS;
    if (!allowed.has(u.field)) return `Field "${u.field}" can't be set on a ${ref.kind}. Allowed: ${[...allowed].join(', ')}.`;

    const v = u.value;
    const isNum = typeof v === 'number' && Number.isFinite(v);
    switch (u.field) {
        case 'name':
            return typeof v === 'string' && v.trim().length > 0 && v.length <= 80 ? null : 'name must be a non-empty string (≤ 80 chars).';
        case 'weight':
            return isNum && (v as number) >= 0 && (v as number) <= 100 ? null : 'weight must be a number from 0 to 100.';
        case 'maxScore':
            return isNum && (v as number) > 0 ? null : 'maxScore must be a number > 0.';
        case 'bestOf': {
            if (v === null) return null;
            const n = ref.comp.subItems?.length ?? 0;
            return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= n ? null : `bestOf must be null or an integer from 1 to ${n} (number of sub-items).`;
        }
        case 'statsMode':
            return v === 'global' || v === 'per-sub' ? null : 'statsMode must be "global" or "per-sub".';
        case 'scaleTargetId':
            if (v === null) return null;
            if (typeof v !== 'string' || !items.has(v)) return 'scaleTargetId must be null or the id of one of your components/sub-items.';
            return v === u.id ? 'An item cannot be scaled from itself.' : null;
        default: // score + class stats
            return v === null || (isNum && (v as number) >= 0) ? null : `${u.field} must be null or a number ≥ 0.`;
    }
}

/** Apply validated updates one by one; invalid ones are reported and skipped. */
export async function applyUpdates(supabase: SupabaseClient, userId: string, updates: Update[]): Promise<UpdateResult[]> {
    const { items } = await loadOwned(supabase, userId);
    const results: UpdateResult[] = [];
    for (const u of updates) {
        const ref = items.get(u?.id);
        const problem = validate(u, ref, items);
        if (problem) {
            results.push({ id: u?.id, field: u?.field, ok: false, error: problem });
            continue;
        }
        const value = u.field === 'name' ? (u.value as string).trim() : u.value;
        if (ref!.kind === 'component') await updateComponentField(supabase, u.id, u.field, value);
        else await updateSubItemField(supabase, u.id, u.field, value);
        results.push({ id: u.id, field: u.field, ok: true });
    }
    return results;
}
