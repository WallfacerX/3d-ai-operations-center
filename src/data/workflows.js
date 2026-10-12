// Ordered workflows keep each worker's travel tied to a department-specific deliverable.
export const taskCatalog = {
  research: { department: 'research', title: 'Analyze market signals', duration: 12, result: 'Research brief: 3 opportunities identified.' },
  development: { department: 'development', title: 'Build automation prototype', duration: 16, result: 'Prototype build passed 24 simulated checks.' },
  security: { department: 'security', title: 'Scan release candidate', duration: 14, result: 'Security report: 0 critical findings in simulated scan.' },
  management: { department: 'management', title: 'Coordinate delivery plan', duration: 10, result: 'Delivery plan approved for the next simulated cycle.' },
  operations: { department: 'operations', title: 'Validate deployment workflow', duration: 13, result: 'Deployment rehearsal complete; all simulated services healthy.' },
  marketing: { department: 'marketing', title: 'Prepare campaign brief', duration: 11, result: 'Campaign brief ready with 3 draft content themes.' },
  database: { department: 'database', title: 'Index company knowledge', duration: 9, result: 'Knowledge index refreshed with 12 simulated records.' },
}

export const workers = [
  { id: 'bot-01', name: 'ATLAS', role: 'Research analyst', home: 'research', color: '#20ff68', workflow: ['research', 'database', 'management'] },
  { id: 'bot-02', name: 'FORGE', role: 'Development engineer', home: 'development', color: '#168eff', workflow: ['development', 'operations', 'management'] },
  { id: 'bot-03', name: 'SENTINEL', role: 'Security analyst', home: 'security', color: '#ff3853', workflow: ['security', 'database', 'operations'] },
  { id: 'bot-04', name: 'SPARK', role: 'Campaign strategist', home: 'marketing', color: '#ff9f19', workflow: ['marketing', 'research', 'management'] },
]
