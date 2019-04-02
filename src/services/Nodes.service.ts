import { inject } from '@loopback/core';
import { Job } from '../models/Job.model';
import { Script, Task } from '../models/Task.model';
import { KubernetesService } from './Kubernetes.service';
import { Connection } from 'amqplib';
import { eachLimit } from 'async';

export class NodesService {

    @inject('config.nodes.connectionLimitPerNode')
    private connectionLimitPerNode: number;

    @inject('services.kubernetes')
    private kubernetesService: KubernetesService;

    @inject('exchange.job.start')
    private startTestExchange: string;

    @inject('queue.node.complete')
    private nodeCompleteQueue: string;

    @inject('queue.job.complete')
    private jobCompleteQueue: string;

    @inject('amqp.conn')
    private amqpConn: Connection;

    async runTest(job: Job, task: Task) {
        await this.prepareTests(job, task);

        await this.startTest(job, task);

        await this.waitForTestsToComplete(job, task);
    }

    private async prepareTests(job: Job, task: Task) {
        await this.kubernetesService.startCloudFoundryMonitor(job, task);

        for (let i = 0; i < task.scripts.length; i++) {
            await this.prepareTest(job, task.scripts[i], i);
        }
    }

    private async prepareTest(job: Job, script: Script, scriptIndex: number) {
        // Calculate and start test clients
        const nodes = NodesService.calculateNodesForTest(script.totalSimulators, this.connectionLimitPerNode);

        await new Promise((resolve) => {
            eachLimit(nodes, 10, (node, next) => {
                this.kubernetesService.startTestPod(job, scriptIndex)
                    .then(() => next());
            }, () => resolve());
        });
    }

    async startTest(job: Job, task: Task) {
        const exchange = `${this.startTestExchange}.${job.id}`;

        const startTestExchange = await this.amqpConn.createChannel();

        await startTestExchange.assertExchange(exchange, 'fanout', {durable: false});

        await startTestExchange.publish(exchange, '', new Buffer((JSON.stringify({
            start: true,
            scripts: task.scripts
        }))));
    }

    static calculateNodesForTest(totalSimulatedUsers: number,
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

    private async waitForTestsToComplete(job: Job, task: Task) {
        const totalSimulators = task.scripts.reduce((total, script) => total + script.totalSimulators, 0);
        const totalNodes = NodesService.calculateNodesForTest(totalSimulators, this.connectionLimitPerNode);

        console.log(`Waiting for all ${totalNodes.length} nodes to complete`);

        const nodeCompleteChannel = await this.amqpConn.createChannel();
        const jobCompleteChannel = await this.amqpConn.createChannel();
        const queue = `${this.nodeCompleteQueue}.${job.id}`;

        await nodeCompleteChannel.assertQueue(queue);

        await new Promise(async (resolve) => {

            let counter = 0;

            await nodeCompleteChannel.consume(queue, () => {
                counter === totalNodes.length - 1 ? resolve() : counter++;

                console.log(`${counter} nodes have completed`);
            }, {noAck: true});
        });

        await nodeCompleteChannel.close();

        const jobCompleteQueue = `${this.jobCompleteQueue}.${job.id}`;

        await jobCompleteChannel.assertQueue(jobCompleteQueue);

        console.log('All nodes have completed')

        await jobCompleteChannel.sendToQueue(jobCompleteQueue, new Buffer((JSON.stringify({done: true}))));
    }

}
