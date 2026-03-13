export interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinedGroups: string[];
  progress: Record<string, number>; // subjectId -> percentage
  contributions: number;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  notes: Note[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface DevGroup {
  id: string;
  name: string;
  description: string;
  members: number;
  maxMembers: number;
  tags: string[];
}

export const subjects: Subject[] = [
  {
    id: "cs101",
    name: "Data Structures",
    icon: "🧩",
    notes: [
      { id: "n1", title: "Arrays & Linked Lists", content: "Arrays store elements in contiguous memory. Linked lists use pointers to connect nodes. Arrays offer O(1) access, linked lists offer O(1) insertion/deletion at known positions.", date: "2026-03-01" },
      { id: "n2", title: "Trees & Graphs", content: "Binary trees have at most two children per node. BSTs maintain ordering. Graphs represent relationships using vertices and edges.", date: "2026-03-05" },
      { id: "n3", title: "Hashing Techniques", content: "Hash tables provide average O(1) lookup. Collision handling: chaining vs open addressing. Load factor impacts performance.", date: "2026-03-10" },
    ],
  },
  {
    id: "cs102",
    name: "Operating Systems",
    icon: "⚙️",
    notes: [
      { id: "n4", title: "Process Management", content: "Processes vs threads. Context switching overhead. Process states: new, ready, running, waiting, terminated.", date: "2026-03-02" },
      { id: "n5", title: "Memory Management", content: "Paging and segmentation. Virtual memory allows processes to use more memory than physically available. Page replacement algorithms: FIFO, LRU, Optimal.", date: "2026-03-06" },
    ],
  },
  {
    id: "cs103",
    name: "Database Systems",
    icon: "🗄️",
    notes: [
      { id: "n6", title: "SQL Fundamentals", content: "SELECT, INSERT, UPDATE, DELETE operations. JOINs: INNER, LEFT, RIGHT, FULL. Aggregation functions: COUNT, SUM, AVG.", date: "2026-03-03" },
      { id: "n7", title: "Normalization", content: "1NF: atomic values. 2NF: no partial dependencies. 3NF: no transitive dependencies. BCNF: every determinant is a candidate key.", date: "2026-03-08" },
    ],
  },
  {
    id: "cs104",
    name: "Computer Networks",
    icon: "🌐",
    notes: [
      { id: "n8", title: "OSI Model", content: "7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. Each layer provides services to the layer above.", date: "2026-03-04" },
    ],
  },
  {
    id: "cs105",
    name: "Web Development",
    icon: "💻",
    notes: [
      { id: "n9", title: "React Fundamentals", content: "Components, props, state, hooks. Virtual DOM diffing. useEffect for side effects. Context API for global state.", date: "2026-03-07" },
      { id: "n10", title: "REST API Design", content: "HTTP methods: GET, POST, PUT, DELETE. Status codes. Resource-based URLs. Stateless communication.", date: "2026-03-09" },
    ],
  },
];

export const devGroups: DevGroup[] = [
  { id: "g1", name: "Algorithm Crushers", description: "Weekly competitive programming and algorithm challenges", members: 12, maxMembers: 20, tags: ["DSA", "Competitive"] },
  { id: "g2", name: "Full Stack Builders", description: "Build real-world projects with modern web technologies", members: 18, maxMembers: 25, tags: ["React", "Node.js", "MongoDB"] },
  { id: "g3", name: "AI/ML Explorers", description: "Explore machine learning models and AI applications", members: 8, maxMembers: 15, tags: ["Python", "TensorFlow", "ML"] },
  { id: "g4", name: "Open Source Contributors", description: "Contribute to popular open source projects together", members: 6, maxMembers: 15, tags: ["Git", "Open Source"] },
  { id: "g5", name: "Mobile Dev Squad", description: "Cross-platform mobile app development", members: 10, maxMembers: 20, tags: ["React Native", "Flutter"] },
];

export const students: Student[] = [
  { id: "s1", name: "Aarav Sharma", email: "aarav@dept.edu", avatar: "AS", joinedGroups: ["g1", "g2"], progress: { cs101: 85, cs102: 72, cs103: 60, cs104: 90, cs105: 78 }, contributions: 14 },
  { id: "s2", name: "Priya Patel", email: "priya@dept.edu", avatar: "PP", joinedGroups: ["g2", "g3"], progress: { cs101: 92, cs102: 88, cs103: 75, cs104: 65, cs105: 95 }, contributions: 22 },
  { id: "s3", name: "Rohan Gupta", email: "rohan@dept.edu", avatar: "RG", joinedGroups: ["g1"], progress: { cs101: 68, cs102: 55, cs103: 80, cs104: 70, cs105: 60 }, contributions: 7 },
  { id: "s4", name: "Sneha Reddy", email: "sneha@dept.edu", avatar: "SR", joinedGroups: ["g3", "g4"], progress: { cs101: 78, cs102: 82, cs103: 90, cs104: 85, cs105: 88 }, contributions: 19 },
  { id: "s5", name: "Vikram Singh", email: "vikram@dept.edu", avatar: "VS", joinedGroups: ["g2", "g5"], progress: { cs101: 55, cs102: 60, cs103: 45, cs104: 72, cs105: 80 }, contributions: 5 },
  { id: "s6", name: "Ananya Joshi", email: "ananya@dept.edu", avatar: "AJ", joinedGroups: ["g4", "g5"], progress: { cs101: 95, cs102: 90, cs103: 88, cs104: 92, cs105: 97 }, contributions: 31 },
];
