import type { Course, SubItem } from '$lib/types';

function makeItems(prefix: string, label: string, n: number, maxScore = 100): SubItem[] {
	return Array.from({ length: n }, (_, i) => ({
		id: `${prefix}-${label.toLowerCase().replace(/\s/g, '-')}-${i + 1}`,
		name: `${label} ${i + 1}`,
		score: null,
		maxScore
	}));
}

export const DEFAULT_COURSES: Course[] = [
	{
		id: 'iss',
		name: 'ISS',
		fullName: 'Information Security & Systems',
		color: '#22d3ee',
		components: [
			{
				id: 'iss-quiz', name: 'Quiz', weight: 10, maxScore: 100, score: null,
				subItems: makeItems('iss', 'Quiz', 2)
			},
			{ id: 'iss-midsem', name: 'Midsem', weight: 15, maxScore: 100, score: null },
			{ id: 'iss-midlab', name: 'Midlab', weight: 15, maxScore: 100, score: null },
			{ id: 'iss-endsem', name: 'Endsem', weight: 15, maxScore: 100, score: null },
			{ id: 'iss-endlab', name: 'Endlab', weight: 20, maxScore: 100, score: null },
			{ id: 'iss-assignment', name: 'Assignment', weight: 5, maxScore: 100, score: null },
			{ id: 'iss-labs', name: 'Labs & Paper Assignments', weight: 10, maxScore: 100, score: null },
			{ id: 'iss-project', name: 'Project', weight: 10, maxScore: 100, score: null }
		]
	},
	{
		id: 'cso',
		name: 'CSO',
		fullName: 'Computer Systems Organisation',
		color: '#a78bfa',
		components: [
			{
				id: 'cso-quiz', name: 'Quiz', weight: 10, maxScore: 100, score: null,
				subItems: makeItems('cso', 'Quiz', 2)
			},
			{ id: 'cso-midsem', name: 'Midsem', weight: 15, maxScore: 100, score: null },
			{ id: 'cso-endsem', name: 'Endsem', weight: 25, maxScore: 100, score: null },
			{
				id: 'cso-endlab', name: 'Endlab + Inclass Test', weight: 20, maxScore: 100, score: null,
				subItems: [
					{ id: 'cso-endlab-1', name: 'Endlab', score: null, maxScore: 100 },
					{ id: 'cso-endlab-2', name: 'Inclass Test', score: null, maxScore: 100 }
				]
			},
			{
				id: 'cso-assignments', name: 'Assignments', weight: 30, maxScore: 100, score: null,
				subItems: makeItems('cso', 'Assignment', 3)
			}
		]
	},
	{
		id: 'iot',
		name: 'IoT',
		fullName: 'Internet of Things',
		color: '#34d399',
		components: [
			{ id: 'iot-midsem', name: 'Midsem', weight: 30, maxScore: 100, score: null },
			{ id: 'iot-endsem', name: 'Endsem', weight: 30, maxScore: 100, score: null },
			{
				id: 'iot-labs', name: 'Labs', weight: 10, maxScore: 100, score: null,
				subItems: makeItems('iot', 'Lab', 8)
			},
			{ id: 'iot-project', name: 'Project', weight: 30, maxScore: 100, score: null }
		]
	},
	{
		id: 'la',
		name: 'LA',
		fullName: 'Linear Algebra',
		color: '#fb923c',
		components: [
			{
				id: 'la-quiz', name: 'Quiz', weight: 20, maxScore: 100, score: null,
				subItems: makeItems('la', 'Quiz', 2)
			},
			{ id: 'la-midsem', name: 'Midsem', weight: 20, maxScore: 100, score: null },
			{ id: 'la-assignments', name: 'Assignments', weight: 30, maxScore: 100, score: null },
			{ id: 'la-endsem', name: 'Endsem', weight: 30, maxScore: 100, score: null }
		]
	},
	{
		id: 'dsa',
		name: 'DSA',
		fullName: 'Data Structures & Algorithms',
		color: '#f472b6',
		components: [
			{
				id: 'dsa-assignments', name: 'Assignments', weight: 9, maxScore: 100, score: null,
				subItems: makeItems('dsa', 'Assignment', 3)
			},
			{
				id: 'dsa-labs', name: 'Labs', weight: 20, maxScore: 300, score: null,
				subItems: makeItems('dsa', 'Lab', 9),
				bestOf: 8
			},
			{
				id: 'dsa-sliptests', name: 'Slip Tests', weight: 8, maxScore: 100, score: null,
				subItems: makeItems('dsa', 'Slip Tests', 9),
				bestOf: 8
			},
			{ id: 'dsa-revision', name: 'Graded Revision Lab', weight: 5, maxScore: 100, score: null },
			{ id: 'dsa-midlab', name: 'Midlab', weight: 8, maxScore: 100, score: null },
			{ id: 'dsa-endlab', name: 'Endlab', weight: 13, maxScore: 100, score: null },
			{ id: 'dsa-midsem', name: 'Midsem', weight: 15, maxScore: 100, score: null },
			{ id: 'dsa-endsem', name: 'Endsem', weight: 22, maxScore: 100, score: null }
		]
	}
];
