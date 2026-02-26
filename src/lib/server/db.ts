import Database from 'better-sqlite3';
import { DEFAULT_COURSES } from '$lib/data/courses';
import type { Course, Component, SubItem } from '$lib/types';
import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';

// ── Ensure data directory exists ─────────────────────────────────────────────
const dataDir = resolve('data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(resolve(dataDir, 'tracksem.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    full_name  TEXT NOT NULL,
    color      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS components (
    id         TEXT PRIMARY KEY,
    course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    weight     REAL NOT NULL DEFAULT 0,
    max_score  REAL NOT NULL DEFAULT 100,
    score      REAL,
    best_of    INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sub_items (
    id           TEXT PRIMARY KEY,
    component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    score        REAL,
    max_score    REAL NOT NULL DEFAULT 100,
    sort_order   INTEGER NOT NULL DEFAULT 0
  );
`);

// ── Seed if empty ────────────────────────────────────────────────────────────
function seed(): void {
    const count = db.prepare('SELECT COUNT(*) as n FROM courses').get() as { n: number };
    if (count.n > 0) return;

    const insertCourse = db.prepare(
        'INSERT INTO courses (id, name, full_name, color) VALUES (?, ?, ?, ?)'
    );
    const insertComponent = db.prepare(
        'INSERT INTO components (id, course_id, name, weight, max_score, score, best_of, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertSubItem = db.prepare(
        'INSERT INTO sub_items (id, component_id, name, score, max_score, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const seedAll = db.transaction(() => {
        for (const course of DEFAULT_COURSES) {
            insertCourse.run(course.id, course.name, course.fullName, course.color);
            course.components.forEach((comp, ci) => {
                insertComponent.run(
                    comp.id, course.id, comp.name, comp.weight,
                    comp.maxScore, comp.score, comp.bestOf ?? null, ci
                );
                if (comp.subItems) {
                    comp.subItems.forEach((sub, si) => {
                        insertSubItem.run(sub.id, comp.id, sub.name, sub.score, sub.maxScore, si);
                    });
                }
            });
        }
    });
    seedAll();
}

seed();

// ── Queries ──────────────────────────────────────────────────────────────────

type CourseRow = { id: string; name: string; full_name: string; color: string };
type ComponentRow = {
    id: string; course_id: string; name: string; weight: number;
    max_score: number; score: number | null; best_of: number | null; sort_order: number;
};
type SubItemRow = {
    id: string; component_id: string; name: string;
    score: number | null; max_score: number; sort_order: number;
};

const stmts = {
    allCourses: db.prepare('SELECT * FROM courses'),
    components: db.prepare('SELECT * FROM components WHERE course_id = ? ORDER BY sort_order'),
    subItems: db.prepare('SELECT * FROM sub_items WHERE component_id = ? ORDER BY sort_order'),
    allComponents: db.prepare('SELECT * FROM components ORDER BY course_id, sort_order'),
    allSubItems: db.prepare('SELECT * FROM sub_items ORDER BY component_id, sort_order'),

    // Mutations
    updateCompScore: db.prepare('UPDATE components SET score = ? WHERE id = ?'),
    updateCompWeight: db.prepare('UPDATE components SET weight = ? WHERE id = ?'),
    updateCompMaxScore: db.prepare('UPDATE components SET max_score = ? WHERE id = ?'),
    updateCompName: db.prepare('UPDATE components SET name = ? WHERE id = ?'),
    updateCompBestOf: db.prepare('UPDATE components SET best_of = ? WHERE id = ?'),

    updateSubScore: db.prepare('UPDATE sub_items SET score = ? WHERE id = ?'),
    updateSubMaxScore: db.prepare('UPDATE sub_items SET max_score = ? WHERE id = ?'),
    updateSubName: db.prepare('UPDATE sub_items SET name = ? WHERE id = ?'),

    insertComponent: db.prepare(
        'INSERT INTO components (id, course_id, name, weight, max_score, score, best_of, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ),
    deleteComponent: db.prepare('DELETE FROM components WHERE id = ?'),

    insertSubItem: db.prepare(
        'INSERT INTO sub_items (id, component_id, name, score, max_score, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ),
    deleteSubItem: db.prepare('DELETE FROM sub_items WHERE id = ?'),

    maxCompOrder: db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM components WHERE course_id = ?'),
    maxSubOrder: db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM sub_items WHERE component_id = ?'),

    deleteCourseComponents: db.prepare('DELETE FROM components WHERE course_id = ?'),
    subItemCount: db.prepare('SELECT COUNT(*) as n FROM sub_items WHERE component_id = ?'),
};

/** Get all courses with nested components and sub-items */
export function getAllCourses(): Course[] {
    const courseRows = stmts.allCourses.all() as CourseRow[];
    const compRows = stmts.allComponents.all() as ComponentRow[];
    const subRows = stmts.allSubItems.all() as SubItemRow[];

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
    for (const c of compRows) {
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
        components: compsByCourse.get(cr.id) || []
    }));
}

// ── Component mutations ──────────────────────────────────────────────────────

export function updateComponentField(id: string, field: string, value: unknown): void {
    switch (field) {
        case 'score': stmts.updateCompScore.run(value, id); break;
        case 'weight': stmts.updateCompWeight.run(value, id); break;
        case 'maxScore': stmts.updateCompMaxScore.run(value, id); break;
        case 'name': stmts.updateCompName.run(value, id); break;
        case 'bestOf': stmts.updateCompBestOf.run(value ?? null, id); break;
    }
}

export function addComponent(courseId: string, id: string, name: string): void {
    const { next } = stmts.maxCompOrder.get(courseId) as { next: number };
    stmts.insertComponent.run(id, courseId, name, 0, 100, null, null, next);
}

export function deleteComponent(id: string): void {
    stmts.deleteComponent.run(id);
}

// ── Sub-item mutations ───────────────────────────────────────────────────────

export function updateSubItemField(id: string, field: string, value: unknown): void {
    switch (field) {
        case 'score': stmts.updateSubScore.run(value, id); break;
        case 'maxScore': stmts.updateSubMaxScore.run(value, id); break;
        case 'name': stmts.updateSubName.run(value, id); break;
    }
}

export function addSubItem(componentId: string, id: string, name: string, maxScore: number): void {
    const { next } = stmts.maxSubOrder.get(componentId) as { next: number };
    stmts.insertSubItem.run(id, componentId, name, null, maxScore, next);
}

export function deleteSubItem(id: string): void {
    stmts.deleteSubItem.run(id);
}

export function getSubItemCount(componentId: string): number {
    return (stmts.subItemCount.get(componentId) as { n: number }).n;
}

// ── Course reset ─────────────────────────────────────────────────────────────

export function resetCourse(courseId: string): void {
    const original = DEFAULT_COURSES.find((c) => c.id === courseId);
    if (!original) return;

    const doReset = db.transaction(() => {
        // Delete all components (cascades to sub_items)
        stmts.deleteCourseComponents.run(courseId);

        // Re-insert from defaults
        original.components.forEach((comp, ci) => {
            stmts.insertComponent.run(
                comp.id, courseId, comp.name, comp.weight,
                comp.maxScore, comp.score, comp.bestOf ?? null, ci
            );
            if (comp.subItems) {
                comp.subItems.forEach((sub, si) => {
                    stmts.insertSubItem.run(sub.id, comp.id, sub.name, sub.score, sub.maxScore, si);
                });
            }
        });
    });
    doReset();
}

export default db;
