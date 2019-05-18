/**
 * Model which describes the attributes of a Node
 */
export interface Node {
    id: string;
    createdAt: string;
    jobId: string;
    name: string;
    running: boolean;
    totalSuccessfulConnections: number;
    totalFailedConnections: number;
    totalDroppedConnections: number;
}