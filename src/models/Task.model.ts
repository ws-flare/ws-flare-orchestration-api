export interface Task {
    id: string;
    projectId: string;
    userId: string;
    name: string;
    uri: string;
    totalSimulatedUsers: number;
    runTime: number;
    cfApi: string;
    cfUser: string;
    cfPass: string;
    cfOrg: string;
    cfSpace: string;
    cfApps: string;
}
