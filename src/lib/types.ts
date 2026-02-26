export type Component = {
    id: string;
    name: string;
    weight: number; // percentage e.g. 15 = 15%
    maxScore: number;
    score: number | null; // null = not yet entered
};

export type Course = {
    id: string;
    name: string; // short e.g. "ISS"
    fullName: string;
    color: string; // accent hex color
    components: Component[];
};
