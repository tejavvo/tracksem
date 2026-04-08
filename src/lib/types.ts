export type SubItem = {
  id: string;
  name: string;
  score: number | null;
  maxScore: number;
};

export type Component = {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
  score: number | null;
  subItems?: SubItem[];
  bestOf?: number;
  classAvg?: number | null;
  classMedian?: number | null;
  classMax?: number | null;
  classStdDev?: number | null;
};

export type Course = {
  id: string;
  name: string;
  fullName: string;
  color: string;
  components: Component[];
};
