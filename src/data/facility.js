export const departments = [
  {
    id: 'management',
    name: 'MANAGEMENT',
    code: 'MGT-01',
    status: 'ONLINE',
    position: [0, 0, 4.5],
    size: [5, 3.5],
    color: '#20ff68',
    description:
      'Executive coordination, strategic planning, decisions and company telemetry.',
  },
  {
    id: 'research',
    name: 'RESEARCH',
    code: 'RND-02',
    status: 'ACTIVE',
    position: [-6, 0, 0],
    size: [4.5, 4],
    color: '#20ff68',
    description:
      'Research queue, technical intelligence, source analysis and discovery.',
  },
  {
    id: 'development',
    name: 'DEVELOPMENT',
    code: 'DEV-03',
    status: 'ACTIVE',
    position: [6, 0, 0],
    size: [4.5, 4],
    color: '#168eff',
    description:
      'Software engineering, prototypes, repositories and development tasks.',
  },
  {
    id: 'security',
    name: 'SECURITY',
    code: 'SEC-04',
    status: 'MONITORING',
    position: [-7, 0, -5.5],
    size: [4, 3.5],
    color: '#ff3853',
    description:
      'Security monitoring, threat analysis, standards and architecture review.',
  },
  {
    id: 'operations',
    name: 'OPERATIONS',
    code: 'OPS-05',
    status: 'ACTIVE',
    position: [0, 0, -4],
    size: [5, 4],
    color: '#20ff68',
    description:
      'Infrastructure, automation, systems, workflow execution and maintenance.',
  },
  {
    id: 'marketing',
    name: 'MARKETING',
    code: 'MKT-06',
    status: 'STANDBY',
    position: [7, 0, -5.5],
    size: [4, 3.5],
    color: '#ff9f19',
    description:
      'Content, campaigns, YouTube, outreach and brand operations.',
  },
  {
    id: 'database',
    name: 'DATABASE',
    code: 'DB-07',
    status: 'ONLINE',
    position: [0, 0, -9],
    size: [4.5, 3],
    color: '#df42ff',
    description:
      'Application data, records, persistence, indexing and internal knowledge.',
  },
]

export const connections = [
  ['management', 'research'],
  ['management', 'development'],
  ['research', 'security'],
  ['research', 'operations'],
  ['development', 'operations'],
  ['development', 'marketing'],
  ['security', 'database'],
  ['operations', 'database'],
  ['marketing', 'database'],
]

const departmentById = new Map(departments.map((department) => [department.id, department]))

export function getDepartment(id) {
  return departmentById.get(id)
}
