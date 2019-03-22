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
        const nodes = this.calculateNodesForTest(task.totalSimulatedUsers, this.connectionLimitPerNode);

        for (let node of nodes) {
            await this.kubernetesService.startTestPod(job, task, node.totalSimulatedUsers);
        }
    }

    async startTest(job: Job) {
        const exchange = `${this.startTestExchange}.${job.id}`;

        const startTestExchange = await this.amqpConn.createChannel();

        await startTestExchange.assertExchange(exchange, 'fanout', {durable: false});

        await startTestExchange.publish(exchange, '', new Buffer((JSON.stringify({start: true}))));
    }

    calculateNodesForTest(totalSimulatedUsers: number,
                          connectionLimitPerNode: number): { totalSimulatedUsers: number }[] {
        let counter = totalSimulatedUsers;
        const nodes: { totalSimulatedUsers: number }[] = [];

        if (totalSimulatedUsers < 0) {
            return [];
        }

        while (counter !== 0) {
            if (counter - connectionLimitPerNode > 0) {
                nodes.push({totalSimulatedUsers: connectionLimitPerNode});
                counter -= connectionLimitPerNode;
            } else {
                nodes.push({totalSimulatedUsers: counter});
                counter -= counter;
            }
        }

        return nodes;
    }

}
