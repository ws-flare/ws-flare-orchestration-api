/**
 * Model which describes the attributes of a Job
 */
export interface Job {
    id: string;
    createdAt: string;
    userId: string;
    taskId: string;
    isRunning: boolean;
    passed: boolean;
}