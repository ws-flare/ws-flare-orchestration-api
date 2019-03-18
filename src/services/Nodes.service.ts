import { inject } from '@loopback/core';
import { Job } from '../models/Job.model';
import { Task } from '../models/Task.model';
import { KubernetesService } from './Kubernetes.service';

export class NodesService {

    @inject('config.nodes.connectionLimitPerNode')
    private connectionLimitPerNode: number;

    @inject('services.kubernetes')
    private kubernetesService: KubernetesService;

    async runTest(job: Job, task: Task) {
        await this.kubernetesService.startTestPod(job, task);
    }
}
