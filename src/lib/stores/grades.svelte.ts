import { DEFAULT_COURSES } from '$lib/data/courses';
import type { Course, Component } from '$lib/types';

const STORAGE_KEY = 'tracksem_grades';

function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function loadFromStorage(): Course[] {
    if (typeof window === 'undefined') return DEFAULT_COURSES;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_COURSES);
        return JSON.parse(raw);
    } catch {
        return structuredClone(DEFAULT_COURSES);
    }
}

function save(courses: Course[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

// Svelte 5 runes reactive store
class GradesStore {
    courses = $state<Course[]>([]);

    constructor() {
        this.courses = loadFromStorage();
    }

    getCourse(id: string): Course | undefined {
        return this.courses.find((c) => c.id === id);
    }

    updateScore(courseId: string, componentId: string, score: number | null): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        const comp = course.components.find((c) => c.id === componentId);
        if (!comp) return;
        comp.score = score;
        save(this.courses);
    }

    updateWeight(courseId: string, componentId: string, weight: number): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        const comp = course.components.find((c) => c.id === componentId);
        if (!comp) return;
        comp.weight = weight;
        save(this.courses);
    }

    updateMaxScore(courseId: string, componentId: string, maxScore: number): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        const comp = course.components.find((c) => c.id === componentId);
        if (!comp) return;
        comp.maxScore = maxScore;
        save(this.courses);
    }

    updateName(courseId: string, componentId: string, name: string): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        const comp = course.components.find((c) => c.id === componentId);
        if (!comp) return;
        comp.name = name;
        save(this.courses);
    }

    addComponent(courseId: string): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        const newComp: Component = {
            id: `${courseId}-${generateId()}`,
            name: 'New Component',
            weight: 0,
            maxScore: 100,
            score: null
        };
        course.components.push(newComp);
        save(this.courses);
    }

    removeComponent(courseId: string, componentId: string): void {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return;
        course.components = course.components.filter((c) => c.id !== componentId);
        save(this.courses);
    }

    resetCourse(courseId: string): void {
        const original = DEFAULT_COURSES.find((c) => c.id === courseId);
        if (!original) return;
        const idx = this.courses.findIndex((c) => c.id === courseId);
        if (idx === -1) return;
        this.courses[idx] = structuredClone(original);
        save(this.courses);
    }

    // Compute projected grade for a course based on filled scores only (% of max)
    projectedGrade(courseId: string): { grade: number | null; filled: number; total: number } {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return { grade: null, filled: 0, total: 0 };

        let weightedSum = 0;
        let filledWeight = 0;

        for (const comp of course.components) {
            if (comp.score !== null) {
                const pct = (comp.score / comp.maxScore) * 100;
                weightedSum += pct * (comp.weight / 100);
                filledWeight += comp.weight;
            }
        }

        if (filledWeight === 0) return { grade: null, filled: 0, total: course.components.length };

        // Scale to full 100%
        const grade = (weightedSum / filledWeight) * 100;
        return { grade, filled: course.components.filter((c) => c.score !== null).length, total: course.components.length };
    }

    totalWeight(courseId: string): number {
        const course = this.courses.find((c) => c.id === courseId);
        if (!course) return 0;
        return course.components.reduce((sum, c) => sum + c.weight, 0);
    }
}

export const grades = new GradesStore();
