import { DEFAULT_COURSES } from '$lib/data/courses';
import type { Course, Component, SubItem } from '$lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Seeding ───────────────────────────────────────────────────────────────────

async function seedDefaultCourses(supabase: SupabaseClient, userId: string): Promise<Course[]> {
    const courseInserts = DEFAULT_COURSES.map((c) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        name: c.name,
        full_name: c.fullName,
        color: c.color
    }));

    const { error: courseErr } = await supabase.from('courses').insert(courseInserts);
    if (courseErr) throw courseErr;

    const componentInserts: {
        id: string;
        course_id: string;
        name: string;
        weight: number;
        max_score: number;
        score: number | null;
        best_of: number | null;
        sort_order: number;
    }[] = [];

    const subItemInserts: {
        id: string;
        component_id: string;
        name: string;
        score: number | null;
        max_score: number;
        sort_order: number;
    }[] = [];

    for (let ci = 0; ci < DEFAULT_COURSES.length; ci++) {
        const course = DEFAULT_COURSES[ci];
        const dbCourseId = courseInserts[ci].id;

        for (let compIdx = 0; compIdx < course.components.length; compIdx++) {
            const comp = course.components[compIdx];
            const dbCompId = crypto.randomUUID();

            componentInserts.push({
                id: dbCompId,
                course_id: dbCourseId,
                name: comp.name,
                weight: comp.weight,
                max_score: comp.maxScore,
                score: comp.score ?? null,
                best_of: comp.bestOf ?? null,
                sort_order: compIdx
            });

            if (comp.subItems) {
                comp.subItems.forEach((sub, si) => {
                    subItemInserts.push({
                        id: crypto.randomUUID(),
                        component_id: dbCompId,
                        name: sub.name,
                        score: sub.score ?? null,
                        max_score: sub.maxScore,
                        sort_order: si
                    });
                });
            }
        }
    }

    if (componentInserts.length > 0) {
        const { error } = await supabase.from('components').insert(componentInserts);
        if (error) throw error;
    }

    if (subItemInserts.length > 0) {
        const { error } = await supabase.from('sub_items').insert(subItemInserts);
        if (error) throw error;
    }

    return fetchAllCourses(supabase);
}

// ── Shared fetch helper ────────────────────────────────────────────────────────

async function fetchAllCourses(supabase: SupabaseClient): Promise<Course[]> {
    const { data: courseRows, error: courseErr } = await supabase
        .from('courses')
        .select('id, name, full_name, color');

    if (courseErr) throw courseErr;
    if (!courseRows || courseRows.length === 0) return [];

    const courseIds = courseRows.map((c) => c.id);

    const { data: compRows, error: compErr } = await supabase
        .from('components')
        .select('id, course_id, name, weight, max_score, score, best_of, sort_order')
        .in('course_id', courseIds)
        .order('sort_order', { ascending: true });

    if (compErr) throw compErr;

    const compIds = (compRows ?? []).map((c) => c.id);
    let subRows: {
        id: string;
        component_id: string;
        name: string;
        score: number | null;
        max_score: number;
        sort_order: number;
    }[] = [];

    if (compIds.length > 0) {
        const { data, error: subErr } = await supabase
            .from('sub_items')
            .select('id, component_id, name, score, max_score, sort_order')
            .in('component_id', compIds)
            .order('sort_order', { ascending: true });

        if (subErr) throw subErr;
        subRows = data ?? [];
    }

    // Build lookup maps
    const subsByComp = new Map<string, SubItem[]>();
    for (const s of subRows) {
        if (!subsByComp.has(s.component_id)) subsByComp.set(s.component_id, []);
        subsByComp.get(s.component_id)!.push({
            id: s.id,
            name: s.name,
            score: s.score,
            maxScore: s.max_score
        });
    }

    const compsByCourse = new Map<string, Component[]>();
    for (const c of compRows ?? []) {
        if (!compsByCourse.has(c.course_id)) compsByCourse.set(c.course_id, []);
        const subs = subsByComp.get(c.id);
        compsByCourse.get(c.course_id)!.push({
            id: c.id,
            name: c.name,
            weight: c.weight,
            maxScore: c.max_score,
            score: c.score,
            subItems: subs && subs.length > 0 ? subs : undefined,
            bestOf: c.best_of ?? undefined
        });
    }

    return courseRows.map((cr) => ({
        id: cr.id,
        name: cr.name,
        fullName: cr.full_name,
        color: cr.color,
        components: compsByCourse.get(cr.id) ?? []
    }));
}

// ── Public query ───────────────────────────────────────────────────────────────

/** Get all courses for the authenticated user, seeding defaults on first login. */
export async function getAllCourses(supabase: SupabaseClient, userId: string): Promise<Course[]> {
    const { count, error: countErr } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

    if (countErr) throw countErr;

    if (count === 0) {
        return seedDefaultCourses(supabase, userId);
    }

    return fetchAllCourses(supabase);
}

// ── Component mutations ────────────────────────────────────────────────────────

const COMP_COL_MAP: Record<string, string> = {
    score: 'score',
    weight: 'weight',
    maxScore: 'max_score',
    name: 'name',
    bestOf: 'best_of'
};

export async function updateComponentField(
    supabase: SupabaseClient,
    id: string,
    field: string,
    value: unknown
): Promise<void> {
    const col = COMP_COL_MAP[field];
    if (!col) return;
    const { error } = await supabase
        .from('components')
        .update({ [col]: value ?? null })
        .eq('id', id);
    if (error) throw error;
}

export async function addComponent(
    supabase: SupabaseClient,
    courseId: string,
    id: string,
    name: string
): Promise<void> {
    const { data } = await supabase
        .from('components')
        .select('sort_order')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: false })
        .limit(1);

    const nextOrder = data && data.length > 0 ? data[0].sort_order + 1 : 0;

    const { error } = await supabase.from('components').insert({
        id,
        course_id: courseId,
        name,
        weight: 0,
        max_score: 100,
        score: null,
        best_of: null,
        sort_order: nextOrder
    });
    if (error) throw error;
}

export async function deleteComponent(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('components').delete().eq('id', id);
    if (error) throw error;
}

// ── Sub-item mutations ─────────────────────────────────────────────────────────

const SUB_COL_MAP: Record<string, string> = {
    score: 'score',
    maxScore: 'max_score',
    name: 'name'
};

export async function updateSubItemField(
    supabase: SupabaseClient,
    id: string,
    field: string,
    value: unknown
): Promise<void> {
    const col = SUB_COL_MAP[field];
    if (!col) return;
    const { error } = await supabase
        .from('sub_items')
        .update({ [col]: value ?? null })
        .eq('id', id);
    if (error) throw error;
}

export async function addSubItem(
    supabase: SupabaseClient,
    componentId: string,
    id: string,
    name: string,
    maxScore: number
): Promise<void> {
    const { data } = await supabase
        .from('sub_items')
        .select('sort_order')
        .eq('component_id', componentId)
        .order('sort_order', { ascending: false })
        .limit(1);

    const nextOrder = data && data.length > 0 ? data[0].sort_order + 1 : 0;

    const { error } = await supabase.from('sub_items').insert({
        id,
        component_id: componentId,
        name,
        score: null,
        max_score: maxScore,
        sort_order: nextOrder
    });
    if (error) throw error;
}

export async function deleteSubItem(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('sub_items').delete().eq('id', id);
    if (error) throw error;
}

export async function getSubItemCount(
    supabase: SupabaseClient,
    componentId: string
): Promise<number> {
    const { count } = await supabase
        .from('sub_items')
        .select('*', { count: 'exact', head: true })
        .eq('component_id', componentId);
    return count ?? 0;
}

// ── Course reset ───────────────────────────────────────────────────────────────

export async function resetCourse(supabase: SupabaseClient, courseId: string): Promise<void> {
    const { data: course } = await supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single();

    if (!course) return;

    const original = DEFAULT_COURSES.find((c) => c.name === course.name);
    if (!original) return;

    // Delete all components (cascades to sub_items via FK)
    await supabase.from('components').delete().eq('course_id', courseId);

    const componentInserts: {
        id: string;
        course_id: string;
        name: string;
        weight: number;
        max_score: number;
        score: number | null;
        best_of: number | null;
        sort_order: number;
    }[] = [];

    const subItemInserts: {
        id: string;
        component_id: string;
        name: string;
        score: number | null;
        max_score: number;
        sort_order: number;
    }[] = [];

    for (let compIdx = 0; compIdx < original.components.length; compIdx++) {
        const comp = original.components[compIdx];
        const dbCompId = crypto.randomUUID();

        componentInserts.push({
            id: dbCompId,
            course_id: courseId,
            name: comp.name,
            weight: comp.weight,
            max_score: comp.maxScore,
            score: comp.score ?? null,
            best_of: comp.bestOf ?? null,
            sort_order: compIdx
        });

        if (comp.subItems) {
            comp.subItems.forEach((sub, si) => {
                subItemInserts.push({
                    id: crypto.randomUUID(),
                    component_id: dbCompId,
                    name: sub.name,
                    score: sub.score ?? null,
                    max_score: sub.maxScore,
                    sort_order: si
                });
            });
        }
    }

    if (componentInserts.length > 0) await supabase.from('components').insert(componentInserts);
    if (subItemInserts.length > 0) await supabase.from('sub_items').insert(subItemInserts);
}