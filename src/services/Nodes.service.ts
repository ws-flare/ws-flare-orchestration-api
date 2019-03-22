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

    @inject('exchange.job.start')
    private startTestExchange: string;

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
        const exchange = `${this.startTestExchange}.${job.id}`;

        const startTestExchange = await this.amqpConn.createChannel();

        await startTestExchange.assertExchange(exchange, 'fanout', {durable: false});

        await startTestExchange.publish(exchange, '', new Buffer((JSON.stringify({start: true}))));
    }

}
