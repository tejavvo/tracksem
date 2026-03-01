import type { Course, SubItem } from "$lib/types";

function makeItems(
  prefix: string,
  label: string,
  n: number,
  maxScore = 100,
): SubItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${label.toLowerCase().replace(/\s/g, "-")}-${i + 1}`,
    name: `${label} ${i + 1}`,
    score: null,
    maxScore,
  }));
}

export const DEFAULT_COURSES: Course[] = [
  {
    id: "cs6201",
    name: "ISS",
    fullName: "Information Security & Systems",
    color: "#22d3ee",
    components: [
      {
        id: "iss-quiz",
        name: "Quiz",
        weight: 10,
        maxScore: 160,
        score: null,
        subItems: makeItems("iss", "Quiz", 2, 80),
      },
      {
        id: "iss-midsem",
        name: "Midsem",
        weight: 15,
        maxScore: 100,
        score: null,
      },
      {
        id: "iss-midlab",
        name: "Midlab",
        weight: 15,
        maxScore: 100,
        score: null,
      },
      {
        id: "iss-endsem",
        name: "Endsem",
        weight: 15,
        maxScore: 100,
        score: null,
      },
      {
        id: "iss-endlab",
        name: "Endlab",
        weight: 20,
        maxScore: 100,
        score: null,
      },
      {
        id: "iss-assignment",
        name: "Assignment",
        weight: 5,
        maxScore: 100,
        score: null,
      },
      {
        id: "iss-labs",
        name: "Labs & Paper Assignments",
        weight: 10,
        maxScore: 100,
        score: null,
      },
      {
        id: "iss-project",
        name: "Project",
        weight: 10,
        maxScore: 100,
        score: null,
      },
    ],
  },
  {
    id: "cs2201",
    name: "CSO",
    fullName: "Computer Systems Organisation",
    color: "#a78bfa",
    components: [
      {
        id: "cso-quiz",
        name: "Quiz",
        weight: 10,
        maxScore: 100,
        score: null,
        subItems: makeItems("cso", "Quiz", 2),
      },
      {
        id: "cso-midsem",
        name: "Midsem",
        weight: 15,
        maxScore: 100,
        score: null,
      },
      {
        id: "cso-endsem",
        name: "Endsem",
        weight: 25,
        maxScore: 100,
        score: null,
      },
      {
        id: "cso-endlab",
        name: "Endlab + Inclass Test",
        weight: 20,
        maxScore: 100,
        score: null,
        subItems: [
          { id: "cso-endlab-1", name: "Endlab", score: null, maxScore: 100 },
          {
            id: "cso-endlab-2",
            name: "Inclass Test",
            score: null,
            maxScore: 100,
          },
        ],
      },
      {
        id: "cso-assignments",
        name: "Assignments",
        weight: 30,
        maxScore: 100,
        score: null,
        subItems: makeItems("cso", "Assignment", 3),
      },
    ],
  },
  {
    id: "cs3303",
    name: "IoT",
    fullName: "Internet of Things",
    color: "#34d399",
    components: [
      {
        id: "iot-midsem",
        name: "Midsem",
        weight: 30,
        maxScore: 100,
        score: null,
      },
      {
        id: "iot-endsem",
        name: "Endsem",
        weight: 30,
        maxScore: 100,
        score: null,
      },
      {
        id: "iot-labs",
        name: "Labs",
        weight: 10,
        maxScore: 100,
        score: null,
        subItems: makeItems("iot", "Lab", 8),
      },
      {
        id: "iot-project",
        name: "Project",
        weight: 30,
        maxScore: 100,
        score: null,
      },
    ],
  },
  {
    id: "ma2101",
    name: "LA",
    fullName: "Linear Algebra",
    color: "#fb923c",
    components: [
      {
        id: "la-quiz",
        name: "Quiz",
        weight: 20,
        maxScore: 100,
        score: null,
        subItems: makeItems("la", "Quiz", 2),
      },
      {
        id: "la-midsem",
        name: "Midsem",
        weight: 20,
        maxScore: 100,
        score: null,
      },
      {
        id: "la-assignments",
        name: "Assignments",
        weight: 30,
        maxScore: 100,
        score: null,
      },
      {
        id: "la-endsem",
        name: "Endsem",
        weight: 30,
        maxScore: 100,
        score: null,
      },
    ],
  },
  {
    id: "cs1201",
    name: "DSA",
    fullName: "Data Structures & Algorithms",
    color: "#f472b6",
    components: [
      {
        id: "dsa-assignments",
        name: "Assignments",
        weight: 9,
        maxScore: 100,
        score: null,
        subItems: makeItems("dsa", "Assignment", 3),
      },
      {
        id: "dsa-labs",
        name: "Labs",
        weight: 20,
        maxScore: 300,
        score: null,
        subItems: makeItems("dsa", "Lab", 9, 300),
        bestOf: 8,
      },
      {
        id: "dsa-sliptests",
        name: "Slip Tests",
        weight: 8,
        maxScore: 100,
        score: null,
        subItems: makeItems("dsa", "Slip Tests", 9),
        bestOf: 8,
      },
      {
        id: "dsa-revision",
        name: "Graded Revision Lab",
        weight: 5,
        maxScore: 100,
        score: null,
      },
      {
        id: "dsa-midlab",
        name: "Midlab",
        weight: 8,
        maxScore: 100,
        score: null,
      },
      {
        id: "dsa-endlab",
        name: "Endlab",
        weight: 13,
        maxScore: 100,
        score: null,
      },
      {
        id: "dsa-midsem",
        name: "Midsem",
        weight: 15,
        maxScore: 100,
        score: null,
      },
      {
        id: "dsa-endsem",
        name: "Endsem",
        weight: 22,
        maxScore: 100,
        score: null,
      },
    ],
  },
];
const PALETTE = [
  "#22d3ee", "#a78bfa", "#34d399", "#fb923c",
  "#f472b6", "#60a5fa", "#f97316", "#10b981",
] as const;

/** Build a Course with empty components (seeded via addCourseWithDefaults). */
function cr(id: string, name: string, fullName: string, ci: number): Course {
  return { id, name, fullName, color: PALETTE[ci % PALETTE.length], components: [] };
}

export const SEM_DATA: Record<string, Record<string, Course[]>> = {
  /* ── CGD  Computer Science & Geospatial Technology (Dual Degree) ── */
  CGD: {
    "Semester 1": [
      cr("ma1101", "MA1.101", "Discrete Structures", 0),
      cr("cs0101", "CS0.101", "Computer Programming", 1),
      cr("ec2101", "EC2.101", "Digital Systems and Microcontroller", 2),
      cr("stp", "STP", "Spatial Thinking and Practice", 3),
    ],
    "Semester 2": [
      cr("ma3101", "MA3.101", "Linear Algebra", 0),
      cr("cs3303", "CS3.303", "Introduction to IoT", 1),
      cr("cs1201", "CS1.201", "Data Structures and Algorithms", 2),
      cr("cs6201", "CS6.201", "Introduction to Software Systems", 3),
      cr("cs2201", "CS2.201", "Computer Systems Organization", 4),
      cr("issl", "ISSL", "Intro to Spatial Sciences with a Lab", 5),
    ],
    "Semester 3": [
      cr("ma6101", "MA6.101", "Probability and Statistics", 0),
      cr("cs4301", "CS4.301", "Data and Applications", 1),
      cr("cs1302", "CS1.302", "Automata Theory", 2),
      cr("cs1301", "CS1.301", "Algorithm Analysis and Design", 3),
      cr("cs3301", "CS3.301", "Operating Systems and Networks", 4),
      cr("cs4408", "CS4.408", "Spatial Informatics", 5),
      cr("ec3202", "EC3.202", "Embedded Systems Workshop", 6),
    ],
    "Semester 4": [
      cr("cs9440", "CS9.440", "Remote Sensing", 0),
      cr("gsd", "GSD", "Geospatial for Sustainable Development", 1),
      cr("cs7301", "CS7.301", "Machine, Data and Learning", 2),
      cr("cs6301", "CS6.301", "Design and Analysis of Software Systems", 3),
      cr("hs8102", "HS8.102", "Introduction to Human Sciences", 4),
    ],
  },

  /* ── CHD  Computer Science & Human Sciences (Dual Degree) ──────── */
  CHD: {
    "Semester 1": [
      cr("ma5101", "MA5.101", "Discrete Structures", 0),
      cr("hs4102", "HS4.102", "Making of Contemporary India", 1),
      cr("cs0101", "CS0.101", "Computer Programming", 2),
      cr("ec2101", "EC2.101", "Digital Systems and Microcontroller", 3),
      cr("hs7101", "HS7.101", "Human Sciences Lab-1", 4),
    ],
    "Semester 2": [
      cr("ma2101", "MA2.101", "Linear Algebra", 0),
      cr("hs8101", "HS8.101", "Making of the Contemporary World", 1),
      cr("hs0201", "HS0.201", "Thinking & Knowing in the Human Sciences - I", 2),
      cr("cs1201", "CS1.201", "Data Structures and Algorithms", 3),
      cr("cs6201", "CS6.201", "Introduction to Software Systems", 4),
    ],
    "Semester 3": [
      cr("ma6101", "MA6.101", "Probability and Statistics", 0),
      cr("hs0202", "HS0.202", "Thinking and Knowing in the Human Sciences - II", 1),
      cr("hs0301", "HS0.301", "Classical Text Readings - I", 2),
      cr("cs1301", "CS1.301", "Algorithm Analysis and Design", 3),
      cr("cs4301", "CS4.301", "Data and Applications", 4),
      cr("cs1302", "CS1.302", "Automata Theory", 5),
    ],
    "Semester 4": [
      cr("cs2201", "CS2.201", "Computer Systems Organization", 0),
      cr("hs0302", "HS0.302", "Research Methods in Human Sciences", 1),
      cr("hs7301", "HS7.301", "Science Technology Society", 2),
      cr("cs6301", "CS6.301", "Design and Analysis of Software Systems", 3),
      cr("cs7301", "CS7.301", "Machine, Data and Learning", 4),
    ],
  },

  /* ── CLD  Computer Science & Linguistics (Dual Degree) ─────────── */
  CLD: {
    "Semester 1": [
      cr("ma5101", "MA5.101", "Discrete Structures", 0),
      cr("cl1101", "CL1.101", "Intro to Linguistics-1", 1),
      cr("cs0101", "CS0.101", "Computer Programming", 2),
      cr("ec2101", "EC2.101", "Digital Systems and Microcontroller", 3),
    ],
    "Semester 2": [
      cr("ma2101", "MA2.101", "Linear Algebra", 0),
      cr("cl1102", "CL1.102", "Introduction to Linguistics-2", 1),
      cr("cl3101", "CL3.101", "Computational Linguistics-1", 2),
      cr("cs1201", "CS1.201", "Data Structures and Algorithms", 3),
      cr("cs6201", "CS6.201", "Introduction to Software Systems", 4),
      cr("cs2201", "CS2.201", "Computer Systems Organization", 5),
    ],
    "Semester 3": [
      cr("ma6101", "MA6.101", "Probability and Statistics", 0),
      cr("cs2203", "CS2.203", "Language and Society", 1),
      cr("cl3202", "CL3.202", "Computational Linguistics-2", 2),
      cr("cs1301", "CS1.301", "Algorithm Analysis and Design", 3),
      cr("cs1302", "CS1.302", "Automata Theory", 4),
      cr("cs4301", "CS4.301", "Data and Applications", 5),
    ],
    "Semester 4": [
      cr("cs7303", "CS7.303", "Digital Signal Analysis", 0),
      cr("csl1204", "CSL1.204", "Language Typology and Universals", 1),
      cr("cs7401", "CS7.401", "Introduction to Natural Language Processing", 2),
      cr("cs6301", "CS6.301", "Design and Analysis of Software Systems", 3),
      cr("cs7301", "CS7.301", "Machine, Data and Learning", 4),
      cr("hs8102", "HS8.102", "Introduction to Human Sciences", 5),
    ],
  },

  /* ── CND  Computer Science & Natural Sciences (Dual Degree) ────── */
  CND: {
    "Semester 1": [
      cr("ma5101", "MA5.101", "Discrete Structures", 0),
      cr("ma4101", "MA4.101", "Real Analysis", 1),
      cr("sc4101", "SC4.101", "Computing in Sciences-1", 2),
      cr("cs0101", "CS0.101", "Computer Programming", 3),
      cr("ec2101", "EC2.101", "Digital Systems & Microcontrollers", 4),
    ],
    "Semester 2": [
      cr("ma2101", "MA2.101", "Linear Algebra", 0),
      cr("sc1102", "SC1.102", "Classical Mechanics", 1),
      cr("sc1101", "SC1.101", "Electrodynamics", 2),
      cr("sc2101", "SC2.101", "General & Structural Chemistry", 3),
      cr("sc4102", "SC4.102", "Computing in Sciences-2", 4),
      cr("cs1201", "CS1.201", "Data Structures & Algorithms", 5),
      cr("cs6201", "CS6.201", "Introduction to Software Systems", 6),
    ],
    "Semester 3": [
      cr("ma6102", "MA6.102", "Probability and Random Processes", 0),
      cr("sc1203", "SC1.203", "Quantum Mechanics", 1),
      cr("sc3101", "SC3.101", "Introduction to Biology", 2),
      cr("sc4110", "SC4.110", "Science Lab-1", 3),
      cr("cs1302", "CS1.302", "Automata Theory", 4),
      cr("cs4301", "CS4.301", "Data and Applications", 5),
      cr("cs1301", "CS1.301", "Algorithm Analysis and Design", 6),
    ],
    "Semester 4": [
      cr("cs2201", "CS2.201", "Computer Systems Organization", 0),
      cr("cs7301", "CS7.301", "Machine, Data and Learning", 1),
      cr("cs6301", "CS6.301", "Design & Analysis of Software Systems", 2),
      cr("sc1204", "SC1.204", "Thermodynamics", 3),
      cr("sc1205", "SC1.205", "Statistical Mechanics", 4),
      cr("sc2203", "SC2.203", "Biomolecular Structures", 5),
      cr("sc2202", "SC2.202", "Organic Chemistry", 6),
      cr("sc4111", "SC4.111", "Science Lab-2", 7),
    ],
  },

  /* ── CSD  Computer Science (Design) ────────────────────────────── */
  CSD: {
    "Semester 1": [
      cr("ma5101", "MA5.101", "Discrete Structures", 0),
      cr("cs0101", "CS0.101", "Computer Programming", 1),
      cr("ma4101", "MA4.101", "Real Analysis", 2),
      cr("ec2101", "EC2.101", "Digital Systems and Microcontrollers", 3),
    ],
    "Semester 2": [
      cr("ma2101", "MA2.101", "Linear Algebra", 0),
      cr("cs3303", "CS3.303", "Introduction to IoT", 1),
      cr("cs1201", "CS1.201", "Data Structures and Algorithms", 2),
      cr("cs6201", "CS6.201", "Introduction to Software Systems", 3),
      cr("cs2201", "CS2.201", "Computer Systems Organization", 4),
    ],
    "Semester 3": [
      cr("ma6101", "MA6.101", "Probability and Statistics", 0),
      cr("cs4301", "CS4.301", "Data and Applications", 1),
      cr("cs1302", "CS1.302", "Automata Theory", 2),
      cr("cs1301", "CS1.301", "Algorithm Analysis and Design", 3),
      cr("cs3301", "CS3.301", "Operating Systems and Networks", 4),
      cr("sc1110", "SC1.110", "Science-1", 5),
      cr("ec3202", "EC3.202", "Embedded Systems Workshop", 6),
    ],
    "Semester 4": [
      cr("cs6301", "CS6.301", "Design and Analysis of Software Systems", 0),
      cr("cs7301", "CS7.301", "Machine, Data and Learning", 1),
      cr("sc1111", "SC1.111", "Science-2", 2),
      cr("hs8102", "HS8.102", "Introduction to Human Sciences", 3),
    ],
  },

  /* ── CSE  Computer Science & Engineering ───────────────────────── */
  CSE: {
    "Semester 1": [
      cr("ma5101", "MA5.101", "Discrete Structures", 0),
      cr("cs0101", "CS0.101", "Computer Programming", 1),
      cr("ma4101", "MA4.101", "Real Analysis", 2),
      cr("ec2101", "EC2.101", "Digital Systems and Microcontrollers", 3),
    ],
    "Semester 2": [
      cr("ma2101", "MA2.101", "Linear Algebra", 0),
      cr("cs3303", "CS3.303", "Introduction to IoT", 1),
      cr("cs1201", "CS1.201", "Data Structures and Algorithms", 2),
      cr("cs6201", "CS6.201", "Introduction to Software Systems", 3),
      cr("cs2201", "CS2.201", "Computer Systems Organization", 4),
    ],
    "Semester 3": [
      cr("ma6101", "MA6.101", "Probability and Statistics", 0),
      cr("cs4301", "CS4.301", "Data and Applications", 1),
      cr("cs1302", "CS1.302", "Automata Theory", 2),
      cr("cs1301", "CS1.301", "Algorithm Analysis and Design", 3),
      cr("cs3301", "CS3.301", "Operating Systems and Networks", 4),
      cr("sc1110", "SC1.110", "Science-1", 5),
      cr("ec3202", "EC3.202", "Embedded Systems Workshop", 6),
    ],
    "Semester 4": [
      cr("cs6301", "CS6.301", "Design and Analysis of Software Systems", 0),
      cr("cs7301", "CS7.301", "Machine, Data and Learning", 1),
      cr("sc1111", "SC1.111", "Science-2", 2),
      cr("hs8102", "HS8.102", "Introduction to Human Sciences", 3),
    ],
  },

  /* ── ECE  Electronics & Communication Engineering ──────────────── */
  ECE: {
    "Semester 1": [
      cr("ec5101", "EC5.101", "Networks, Signals and Systems", 0),
      cr("ma4101", "MA4.101", "Real Analysis", 1),
      cr("ec2101", "EC2.101", "Digital Systems and Microcontrollers", 2),
      cr("cs0101", "CS0.101", "Computer Programming", 3),
      cr("ec2102", "EC2.102", "Electronic Workshop-1", 4),
    ],
    "Semester 2": [
      cr("cs1201", "CS1.201", "Data Structures and Algorithms", 0),
      cr("ma2101", "MA2.101", "Linear Algebra", 1),
      cr("ec2103", "EC2.103", "Analog Electronic Circuits", 2),
      cr("ec5102", "EC5.102", "Information and Communication", 3),
    ],
    "Semester 3": [
      cr("ma6102", "MA6.102", "Probability and Random Processes", 0),
      cr("ec5201", "EC5.201", "Signal Processing", 1),
      cr("ec5202", "EC5.202", "Systems Thinking", 2),
      cr("ec6201", "EC6.201", "VLSI Design", 3),
      cr("sc1110", "SC1.110", "Science-1", 4),
    ],
    "Semester 4": [
      cr("ec5203", "EC5.203", "Communication Theory", 0),
      cr("ec2202", "EC2.202", "Electronic Workshop-2", 1),
      cr("hs8102", "HS8.102", "Introduction to Human Sciences", 2),
      cr("ec6202", "EC6.202", "Intro to Processor Architecture", 3),
    ],
  },

  /* ── ECD  Electronics & Communication (Dual Degree) ────────────── */
  ECD: {
    "Semester 1": [
      cr("ec5101", "EC5.101", "Networks, Signals and Systems", 0),
      cr("ma4101", "MA4.101", "Real Analysis", 1),
      cr("ec2101", "EC2.101", "Digital Systems and Microcontrollers", 2),
      cr("cs0101", "CS0.101", "Computer Programming", 3),
      cr("ec2102", "EC2.102", "Electronic Workshop-1", 4),
    ],
    "Semester 2": [
      cr("cs1201", "CS1.201", "Data Structures and Algorithms", 0),
      cr("ma2101", "MA2.101", "Linear Algebra", 1),
      cr("ec2103", "EC2.103", "Analog Electronic Circuits", 2),
      cr("ec5102", "EC5.102", "Information and Communication", 3),
    ],
    "Semester 3": [
      cr("ma6102", "MA6.102", "Probability and Random Processes", 0),
      cr("ec5201", "EC5.201", "Signal Processing", 1),
      cr("ec5202", "EC5.202", "Systems Thinking", 2),
      cr("ec6201", "EC6.201", "VLSI Design", 3),
      cr("sc1110", "SC1.110", "Science-1", 4),
    ],
    "Semester 4": [
      cr("ec5203", "EC5.203", "Communication Theory", 0),
      cr("ec2202", "EC2.202", "Electronic Workshop-2", 1),
      cr("hs8102", "HS8.102", "Introduction to Human Sciences", 2),
      cr("ec6202", "EC6.202", "Intro to Processor Architecture", 3),
    ],
  },
};

export const BRANCHES = Object.keys(SEM_DATA);
export function getSemesters(branch: string): string[] {
  return Object.keys(SEM_DATA[branch] ?? {});
}
export function getCourses(branch: string, sem: string): Course[] {
  return SEM_DATA[branch]?.[sem] ?? [];
}
