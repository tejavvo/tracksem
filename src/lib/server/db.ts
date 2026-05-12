import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { DEFAULT_COURSES, SEM_DATA } from '$lib/data/courses';
import type { Course, Component, SubItem } from '$lib/types';

type CourseRow = {
	id: string;
	name: string;
	full_name: string;
	color: string;
};

type ComponentRow = {
	id: string;
	course_id: string;
	name: string;
	weight: number;
	max_score: number;
	score: number | null;
	best_of: number | null;
	sort_order: number;
	stats_mode: 'global' | 'per-sub' | null;
	scale_target_id: string | null;
	class_avg: number | null;
	class_median: number | null;
	class_max: number | null;
	class_std_dev: number | null;
};

type SubItemRow = {
	id: string;
	component_id: string;
	name: string;
	score: number | null;
	max_score: number;
	sort_order: number;
	class_avg: number | null;
	class_median: number | null;
	class_max: number | null;
	class_std_dev: number | null;
	scale_target_id: string | null;
};

const dbPath = resolve(process.cwd(), 'data', 'tracksem.db');
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
	CREATE TABLE IF NOT EXISTS courses (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		full_name TEXT NOT NULL,
		color TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS components (
		id TEXT PRIMARY KEY,
		course_id TEXT NOT NULL,
		name TEXT NOT NULL,
		weight REAL NOT NULL,
		max_score REAL NOT NULL,
		score REAL,
		best_of INTEGER,
		sort_order INTEGER NOT NULL,
		stats_mode TEXT DEFAULT 'global',
		class_avg REAL,
		class_median REAL,
		class_max REAL,
		class_std_dev REAL,
		FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS sub_items (
		id TEXT PRIMARY KEY,
		component_id TEXT NOT NULL,
		name TEXT NOT NULL,
		score REAL,
		max_score REAL NOT NULL,
		sort_order INTEGER NOT NULL,
		class_avg REAL,
		class_median REAL,
		class_max REAL,
		class_std_dev REAL,
		scale_target_id TEXT,
		FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
	);
`);

const componentColumns = db.prepare('PRAGMA table_info(components)').all() as { name: string }[];
if (!componentColumns.some((column) => column.name === 'scale_target_id')) {
	db.prepare('ALTER TABLE components ADD COLUMN scale_target_id TEXT').run();
}

const subItemColumns = db.prepare('PRAGMA table_info(sub_items)').all() as { name: string }[];
if (!subItemColumns.some((column) => column.name === 'scale_target_id')) {
	db.prepare('ALTER TABLE sub_items ADD COLUMN scale_target_id TEXT').run();
}

function fetchAllCourses(): Course[] {
	const courseRows = db
		.prepare('SELECT id, name, full_name, color FROM courses ORDER BY rowid ASC')
		.all() as CourseRow[];

	if (courseRows.length === 0) return [];

	const componentRows = db
		.prepare(
			`SELECT id, course_id, name, weight, max_score, score, best_of, sort_order, stats_mode, scale_target_id,
			 class_avg, class_median, class_max, class_std_dev
			 FROM components
			 ORDER BY course_id, sort_order ASC`
		)
		.all() as ComponentRow[];

	const subRows = db
		.prepare(
			`SELECT id, component_id, name, score, max_score, sort_order,
			 class_avg, class_median, class_max, class_std_dev, scale_target_id
			 FROM sub_items
			 ORDER BY component_id, sort_order ASC`
		)
		.all() as SubItemRow[];

	const subsByComp = new Map<string, SubItem[]>();
	for (const row of subRows) {
		const subItem: SubItem = {
			id: row.id,
			name: row.name,
			score: row.score,
			maxScore: row.max_score,
			classAvg: row.class_avg,
			classMedian: row.class_median,
			classMax: row.class_max,
			classStdDev: row.class_std_dev,
			scaleTargetId: row.scale_target_id
		};

		const current = subsByComp.get(row.component_id) ?? [];
		current.push(subItem);
		subsByComp.set(row.component_id, current);
	}

	const compsByCourse = new Map<string, Component[]>();
	for (const row of componentRows) {
		const component: Component = {
			id: row.id,
			name: row.name,
			weight: row.weight,
			maxScore: row.max_score,
			score: row.score,
			bestOf: row.best_of ?? undefined,
			statsMode: row.stats_mode === 'per-sub' ? 'per-sub' : 'global',
			scaleTargetId: row.scale_target_id,
			classAvg: row.class_avg,
			classMedian: row.class_median,
			classMax: row.class_max,
			classStdDev: row.class_std_dev,
			subItems: subsByComp.get(row.id)
		};

		if (!component.subItems?.length) {
			delete component.subItems;
		}

		const current = compsByCourse.get(row.course_id) ?? [];
		current.push(component);
		compsByCourse.set(row.course_id, current);
	}

	return courseRows.map((course) => ({
		id: course.id,
		name: course.name,
		fullName: course.full_name,
		color: course.color,
		components: compsByCourse.get(course.id) ?? []
	}));
}

function insertCourse(courseId: string, course: Pick<Course, 'name' | 'fullName' | 'color'>): void {
	db.prepare('INSERT INTO courses (id, name, full_name, color) VALUES (?, ?, ?, ?)').run(
		courseId,
		course.name,
		course.fullName,
		course.color
	);
}

function insertComponents(courseId: string, components: Component[]): Component[] {
	const insertComponentStmt = db.prepare(
		`INSERT INTO components (
			id, course_id, name, weight, max_score, score, best_of, sort_order,
			stats_mode, scale_target_id, class_avg, class_median, class_max, class_std_dev
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	const insertSubItemStmt = db.prepare(
		`INSERT INTO sub_items (
			id, component_id, name, score, max_score, sort_order,
			class_avg, class_median, class_max, class_std_dev, scale_target_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);

	return components.map((component, compIdx) => {
		const componentId = crypto.randomUUID();
		insertComponentStmt.run(
			componentId,
			courseId,
			component.name,
			component.weight,
			component.maxScore,
			component.score ?? null,
			component.bestOf ?? null,
			compIdx,
			component.statsMode ?? 'global',
			component.scaleTargetId ?? null,
			component.classAvg ?? null,
			component.classMedian ?? null,
			component.classMax ?? null,
			component.classStdDev ?? null
		);

		const subItems = component.subItems?.map((subItem, subIdx) => {
			const subItemId = crypto.randomUUID();
			insertSubItemStmt.run(
				subItemId,
				componentId,
				subItem.name,
				subItem.score ?? null,
				subItem.maxScore,
				subIdx,
				subItem.classAvg ?? null,
				subItem.classMedian ?? null,
				subItem.classMax ?? null,
				subItem.classStdDev ?? null,
				subItem.scaleTargetId ?? null
			);

			return {
				id: subItemId,
				name: subItem.name,
				score: subItem.score ?? null,
				maxScore: subItem.maxScore,
				classAvg: subItem.classAvg ?? null,
				classMedian: subItem.classMedian ?? null,
				classMax: subItem.classMax ?? null,
				classStdDev: subItem.classStdDev ?? null,
				scaleTargetId: subItem.scaleTargetId ?? null
			};
		});

		return {
			id: componentId,
			name: component.name,
			weight: component.weight,
			maxScore: component.maxScore,
			score: component.score ?? null,
			bestOf: component.bestOf,
			statsMode: component.statsMode ?? 'global',
			scaleTargetId: component.scaleTargetId ?? null,
			classAvg: component.classAvg ?? null,
			classMedian: component.classMedian ?? null,
			classMax: component.classMax ?? null,
			classStdDev: component.classStdDev ?? null,
			subItems: subItems?.length ? subItems : undefined
		};
	});
}

const createCourseFromTemplate = db.transaction((template: Course) => {
	const courseId = crypto.randomUUID();
	insertCourse(courseId, template);
	const components = insertComponents(courseId, template.components);

	return {
		id: courseId,
		name: template.name,
		fullName: template.fullName,
		color: template.color,
		components
	};
});

export async function seedByBranch(selectedCourses: Course[]): Promise<Course[]> {
	const seeded: Course[] = [];

	for (const selectedCourse of selectedCourses) {
		const defaultMatch = DEFAULT_COURSES.find((course) => course.id === selectedCourse.id);

		if (defaultMatch && defaultMatch.components.length > 0) {
			seeded.push(
				createCourseFromTemplate({
					...defaultMatch,
					name: selectedCourse.name,
					fullName: selectedCourse.fullName,
					color: selectedCourse.color
				})
			);
			continue;
		}

		if (selectedCourse.components.length > 0) {
			seeded.push(createCourseFromTemplate(selectedCourse));
			continue;
		}

		seeded.push(
			await addCourseWithDefaults(selectedCourse.name, selectedCourse.fullName, selectedCourse.color)
		);
	}

	return seeded;
}

export async function getAllCourses(): Promise<Course[]> {
	return fetchAllCourses();
}

export async function addCourseWithDefaults(
	name: string,
	fullName: string,
	color: string
): Promise<Course> {
	return createCourseFromTemplate({
		id: crypto.randomUUID(),
		name,
		fullName,
		color,
		components: [
			{
				id: crypto.randomUUID(),
				name: 'Quiz',
				weight: 0,
				maxScore: 100,
				score: null,
				subItems: [
					{ id: crypto.randomUUID(), name: 'Quiz 1', score: null, maxScore: 100 },
					{ id: crypto.randomUUID(), name: 'Quiz 2', score: null, maxScore: 100 }
				]
			},
			{
				id: crypto.randomUUID(),
				name: 'Midsem',
				weight: 0,
				maxScore: 100,
				score: null
			},
			{
				id: crypto.randomUUID(),
				name: 'Endsem',
				weight: 0,
				maxScore: 100,
				score: null
			}
		]
	});
}

export async function addCourseWithComponents(template: Course): Promise<Course> {
	return createCourseFromTemplate(template);
}

export async function deleteCourse(courseId: string): Promise<void> {
	db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
}

const COMP_COL_MAP: Record<string, string> = {
	score: 'score',
	weight: 'weight',
	maxScore: 'max_score',
	name: 'name',
	bestOf: 'best_of',
	statsMode: 'stats_mode',
	scaleTargetId: 'scale_target_id',
	classAvg: 'class_avg',
	classMedian: 'class_median',
	classMax: 'class_max',
	classStdDev: 'class_std_dev'
};

export async function updateComponentField(id: string, field: string, value: unknown): Promise<void> {
	const column = COMP_COL_MAP[field];
	if (!column) return;

	db.prepare(`UPDATE components SET ${column} = ? WHERE id = ?`).run(value ?? null, id);
}

export async function addComponent(courseId: string, id: string, name: string): Promise<void> {
	const row = db
		.prepare('SELECT sort_order FROM components WHERE course_id = ? ORDER BY sort_order DESC LIMIT 1')
		.get(courseId) as { sort_order: number } | undefined;
	const nextOrder = row ? row.sort_order + 1 : 0;

	db.prepare(
		`INSERT INTO components (
			id, course_id, name, weight, max_score, score, best_of, sort_order,
			stats_mode, scale_target_id, class_avg, class_median, class_max, class_std_dev
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(id, courseId, name, 0, 100, null, null, nextOrder, 'global', null, null, null, null, null);
}

export async function deleteComponent(id: string): Promise<void> {
	db.prepare('DELETE FROM components WHERE id = ?').run(id);
}

const SUB_COL_MAP: Record<string, string> = {
	score: 'score',
	maxScore: 'max_score',
	name: 'name',
	classAvg: 'class_avg',
	classMedian: 'class_median',
	classMax: 'class_max',
	classStdDev: 'class_std_dev'
};

export async function updateSubItemField(id: string, field: string, value: unknown): Promise<void> {
	const column = SUB_COL_MAP[field];
	if (!column) return;

	db.prepare(`UPDATE sub_items SET ${column} = ? WHERE id = ?`).run(value ?? null, id);
}

export async function addSubItem(
	componentId: string,
	id: string,
	name: string,
	maxScore: number
): Promise<void> {
	const row = db
		.prepare('SELECT sort_order FROM sub_items WHERE component_id = ? ORDER BY sort_order DESC LIMIT 1')
		.get(componentId) as { sort_order: number } | undefined;
	const nextOrder = row ? row.sort_order + 1 : 0;

	db.prepare(
		`INSERT INTO sub_items (
			id, component_id, name, score, max_score, sort_order,
			class_avg, class_median, class_max, class_std_dev, scale_target_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(id, componentId, name, null, maxScore, nextOrder, null, null, null, null, null);
}

export async function deleteSubItem(id: string): Promise<void> {
	db.prepare('DELETE FROM sub_items WHERE id = ?').run(id);
}

export async function getSubItemCount(componentId: string): Promise<number> {
	const row = db
		.prepare('SELECT COUNT(*) as count FROM sub_items WHERE component_id = ?')
		.get(componentId) as { count: number };

	return row.count;
}

const resetCourseTx = db.transaction((courseId: string, original: Course) => {
	db.prepare('DELETE FROM components WHERE course_id = ?').run(courseId);
	insertComponents(courseId, original.components);
});

export async function resetCourse(courseId: string): Promise<void> {
	const row = db.prepare('SELECT name FROM courses WHERE id = ?').get(courseId) as { name: string } | undefined;
	if (!row) return;

	let original = DEFAULT_COURSES.find((course) => course.name === row.name);
	if (!original) {
		for (const branch of Object.values(SEM_DATA)) {
			for (const courses of Object.values(branch)) {
				const match = courses.find((course) => course.name === row.name);
				if (match) {
					original = match;
					break;
				}
			}

			if (original) break;
		}
	}

	if (!original) return;
	resetCourseTx(courseId, original);
}
