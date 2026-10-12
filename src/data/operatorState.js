export const terminalStates = ['completed', 'cancelled', 'failed']
export function availableWorkers(workers, tasks, taskId) {
  return workers.filter((worker) => worker.status === 'idle' && worker.currentTaskId === null && !tasks.some((task) => task.id !== taskId && task.assignedWorkerId === worker.id && !terminalStates.includes(task.status)))
}
export function taskActions(task) {
  return ({ draft: ['assign', 'cancel'], queued: ['assign', 'cancel'], assigned: ['start', 'cancel'], traveling: ['begin-work', 'cancel'], working: ['cancel'], revision_requested: ['resume', 'cancel'] })[task.status] ?? []
}
