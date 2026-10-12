import { getDepartment } from './facility.js'

export function resolveDestination(worker, task) {
  if (!getDepartment(worker.department)) return 'management'
  const type = task?.type === 'engineering' ? 'development' : task?.type
  return getDepartment(type)?.id ?? getDepartment(worker.department)?.id ?? 'management'
}

export function mapWorkers(workers, tasks) {
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  return workers.map((worker) => {
    const candidate = taskById.get(worker.currentTaskId)
    const task = candidate?.assignedWorkerId === worker.id ? candidate : null
    const department = getDepartment(worker.department)
    return {
      ...worker, task,
      destination: resolveDestination(worker, task),
      color: department?.color ?? '#8baba0',
      lane: [(worker.id % 2 ? -1 : 1) * 0.55, (Math.floor((worker.id - 1) / 2) % 2 ? -1 : 1) * 0.45],
      warning: !department ? 'Unmapped department' : worker.currentTaskId !== null && !task ? 'Current task unavailable or assignment inconsistent; waiting for refresh.' : null,
    }
  })
}
