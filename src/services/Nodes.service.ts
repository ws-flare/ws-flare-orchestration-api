import { inject } from '@loopback/core';
import { Job } from '../models/Job.model';
import { Task } from '../models/Task.model';
import { KubernetesService } from './Kubernetes.service';
import { Connection } from 'amqplib';

export class NodesService {

    @inject('config.nodes.connectionLimitPerNode')
    private connectionLimitPerNode: number;

    @inject('services.kubernetes')
    private kubernetesService: KubernetesService;

    @inject('queue.job.start')
    private startTestQueue: string;

    @inject('amqp.conn')
    private amqpConn: Connection;

    async runTest(job: Job, task: Task) {
        await this.prepareTest(job, task);
        await this.startTest(job);
    }

    private async prepareTest(job: Job, task: Task) {
        const total = task.totalSimulatedUsers / this.connectionLimitPerNode;

        console.log('Total is: ' + total);

        for (let i = 0; i < total; i++) {
            await this.kubernetesService.startTestPod(job, task);
        }
    }

    async startTest(job: Job) {
        const queue = `${this.startTestQueue}.${job.id}`;

        const startTestChannel = await this.amqpConn.createChannel();
        await startTestChannel.assertQueue(queue);

        await startTestChannel.sendToQueue(queue, new Buffer((JSON.stringify({start: true}))));
    }

}
