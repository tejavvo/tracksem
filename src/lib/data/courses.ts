import type { Course } from '$lib/types';

export const DEFAULT_COURSES: Course[] = [
	{
		id: 'iss',
		name: 'ISS',
		fullName: 'Information Security & Systems',
		color: '#22d3ee',
		components: [
			{ id: 'iss-1', name: 'Quiz (×2)', weight: 10, maxScore: 100, score: null },
			{ id: 'iss-2', name: 'Midsem', weight: 15, maxScore: 100, score: null },
			{ id: 'iss-3', name: 'Midlab', weight: 15, maxScore: 100, score: null },
			{ id: 'iss-4', name: 'Endsem', weight: 15, maxScore: 100, score: null },
			{ id: 'iss-5', name: 'Endlab', weight: 20, maxScore: 100, score: null },
			{ id: 'iss-6', name: 'Assignment', weight: 5, maxScore: 100, score: null },
			{ id: 'iss-7', name: 'Labs & Paper Assignments', weight: 10, maxScore: 100, score: null },
			{ id: 'iss-8', name: 'Project', weight: 10, maxScore: 100, score: null }
		]
	},
	{
		id: 'cso',
		name: 'CSO',
		fullName: 'Computer Systems Organisation',
		color: '#a78bfa',
		components: [
			{ id: 'cso-1', name: 'Quiz (×2)', weight: 10, maxScore: 100, score: null },
			{ id: 'cso-2', name: 'Midsem', weight: 15, maxScore: 100, score: null },
			{ id: 'cso-3', name: 'Endsem', weight: 25, maxScore: 100, score: null },
			{ id: 'cso-4', name: 'Endlab + Inclass Test', weight: 15, maxScore: 100, score: null },
			{ id: 'cso-5', name: 'Assignments (×3)', weight: 30, maxScore: 100, score: null }
		]
	},
	{
		id: 'iot',
		name: 'IoT',
		fullName: 'Internet of Things',
		color: '#34d399',
		components: [
			{ id: 'iot-1', name: 'Midsem', weight: 30, maxScore: 100, score: null },
			{ id: 'iot-2', name: 'Endsem', weight: 30, maxScore: 100, score: null },
			{ id: 'iot-3', name: 'Labs (×8)', weight: 10, maxScore: 100, score: null },
			{ id: 'iot-4', name: 'Project', weight: 30, maxScore: 100, score: null }
		]
	},
	{
		id: 'la',
		name: 'LA',
		fullName: 'Linear Algebra',
		color: '#fb923c',
		components: [
			{ id: 'la-1', name: 'Quiz (×2)', weight: 20, maxScore: 100, score: null },
			{ id: 'la-2', name: 'Midsem', weight: 20, maxScore: 100, score: null },
			{ id: 'la-3', name: 'Assignments', weight: 30, maxScore: 100, score: null },
			{ id: 'la-4', name: 'Endsem', weight: 30, maxScore: 100, score: null }
		]
	},
	{
		id: 'dsa',
		name: 'DSA',
		fullName: 'Data Structures & Algorithms',
		color: '#f472b6',
		components: [
			{ id: 'dsa-1', name: 'Assignments (×3)', weight: 9, maxScore: 100, score: null },
			{ id: 'dsa-2', name: 'Labs (best 8/9)', weight: 20, maxScore: 100, score: null },
			{ id: 'dsa-3', name: 'Graded Revision Lab', weight: 5, maxScore: 100, score: null },
			{ id: 'dsa-4', name: 'Midlab', weight: 8, maxScore: 100, score: null },
			{ id: 'dsa-5', name: 'Endlab', weight: 13, maxScore: 100, score: null },
			{ id: 'dsa-6', name: 'Midsem', weight: 15, maxScore: 100, score: null },
			{ id: 'dsa-7', name: 'Endsem', weight: 22, maxScore: 100, score: null }
		]
	}
];
