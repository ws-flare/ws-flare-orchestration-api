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
}

export interface Script {
    start: number; // Seconds
    timeout: number; // Seconds
    totalSimulators: number;
    target: string;
    retryLimit: number;
    payloads?: SocketPayload[];
}

export interface SocketPayload {
    start: number; // Seconds
    payload: any;
}
