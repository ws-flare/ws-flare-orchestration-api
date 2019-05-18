import {inject} from '@loopback/core';
import {Job} from '../models/Job.model';
import {Script, Task} from '../models/Task.model';
import {KubernetesService} from './Kubernetes.service';
import {Connection} from 'amqplib';
import {eachLimit} from 'async';
import {ResultsService} from './results.service';
import {Logger} from 'winston';

/**
 * Service for handling the orchestration of tests
 */
export class NodesService {

    @inject('logger')
    private logger: Logger;

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

    @inject('services.results')
    private resultsService: ResultsService;

    /**
     * Runs a new test to simulate web sockets
     *
     * @param job - The job
     * @param task - The task
     */
    async runTest(job: Job, task: Task) {
        // Set up tests
        await this.prepareTests(job, task);

        // Start tests
        await this.startTest(job, task);

        // Wait for tests to complete
        await this.waitForTestsToComplete(job, task);
    }


    /**
     * Start a new cloud foundry monitor pod and prepare tests
     *
     * @param job - The job
     * @param task - The task
     */
    private async prepareTests(job: Job, task: Task) {
        // Wait for cloud foundry monitor to start
        await this.kubernetesService.startCloudFoundryMonitor(job, task);

        // Prepare tests
        for (let i = 0; i < task.scripts.length; i++) {
            await this.prepareTest(job, task.scripts[i], i);
        }
    }

    /**
     * Calculate how many kubernetes pods are needed to start the test then start the test
     *
     * @param job - The job
     * @param script - The script
     * @param scriptIndex - The script index
     */
    private async prepareTest(job: Job, script: Script, scriptIndex: number) {
        // Calculate and start test clients
        const nodes = NodesService.calculateNodesForTest(script.totalSimulators, this.connectionLimitPerNode);

        // Start test pods 10 at a time
        await new Promise((resolve) => {
            eachLimit(nodes, 10, (node, next) => {
                this.kubernetesService.startTestPod(job, node.totalSimulatedUsers, scriptIndex)
                    .then(() => next());
            }, () => resolve());
        });
    }

    /**
     * After each pod has been creates, send out a message on rabbitMQ to start the tests. Each pod will be listening
     * on the queue and will start when the message is received
     *
     * @param job - The job
     * @param task - The task
     */
    async startTest(job: Job, task: Task) {
        const exchange = `${this.startTestExchange}.${job.id}`;
        const startTestExchange = await this.amqpConn.createChannel();
        await startTestExchange.assertExchange(exchange, 'fanout', {durable: false});
        await startTestExchange.publish(exchange, '', new Buffer((JSON.stringify({
            start: true,
            scripts: task.scripts
        }))));
    }

    /**
     * Calculates how many kubernetes pods are needed to achieve the required simulation load
     *
     * @param totalSimulatedUsers - The total amount to simulate
     * @param connectionLimitPerNode - The connection limit of each pod
     */
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

    /**
     * Waits for all tests to complete
     *
     * @param job - The job
     * @param task - The task
     */
    private async waitForTestsToComplete(job: Job, task: Task) {
        const totalSimulators = task.scripts.reduce((total, script) => total + script.totalSimulators, 0);
        const totalNodes = NodesService.calculateNodesForTest(totalSimulators, this.connectionLimitPerNode);

        this.logger.info(`Waiting for all ${totalNodes.length} nodes to complete`);

        // Wait for all jobs to complete
        const nodeCompleteChannel = await this.amqpConn.createChannel();
        const queue = `${this.nodeCompleteQueue}.${job.id}`;
        await nodeCompleteChannel.assertQueue(queue);

        await new Promise((resolve) => {
            let counter = 0;

            nodeCompleteChannel.consume(queue, () => {
                counter === totalNodes.length - 1 ? resolve() : counter++;

                this.logger.info(`${counter} nodes have completed`);
            }, {noAck: true});
        });

        await nodeCompleteChannel.close();
        this.logger.info('All nodes have completed');

        const passed = await this.resultsService.calculateResults(task, job);

        // Send message that job has completed
        const jobCompleteQueue = `${this.jobCompleteQueue}.${job.id}`;
        const jobCompleteChannel = await this.amqpConn.createChannel();
        await jobCompleteChannel.assertExchange(jobCompleteQueue, 'fanout', {durable: false});
        await jobCompleteChannel.publish(jobCompleteQueue, '', new Buffer((JSON.stringify({done: true, passed}))));

        await jobCompleteChannel.close();
    }

}
