export interface Task {
    id: string;
    projectId: string;
    userId: string;
    name: string;
    script: Script[];
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
