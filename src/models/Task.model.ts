/**
 * Model which describes the attributes of a Task
 */
export interface Task {
    id: string;
    projectId: string;
    userId: string;
    name: string;
    scripts: Script[];
    cfApi?: string;
    cfUser?: string;
    cfPass?: string;
    cfOrg?: string;
    cfSpace?: string;
    cfApps?: string;
    successThreshold: number;
}

/**
 * Model which describes the attributes of a Script
 */
export interface Script {
    start: number; // Seconds
    timeout: number; // Seconds
    totalSimulators: number;
    target: string;
    retryLimit: number;
    payloads?: SocketPayload[];
}

/**
 * Model which describes the attributes of a socket
 */
export interface SocketPayload {
    start: number; // Seconds
    payload: any;
}
