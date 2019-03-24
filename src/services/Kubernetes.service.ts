import * as uuid from 'uuid/v4';
import { inject } from '@loopback/core';
import { Task } from '../models/Task.model';
import { Job } from '../models/Job.model';
import ApiRoot = KubernetesClient.ApiRoot;
import { Connection } from 'amqplib';

export class KubernetesService {

    @inject('config.kubernetes.testImage')
    private testImage: string;

    @inject('api.jobs')
    private jobsApi: string;

    @inject('kubernetes.client')
    private kubernetesClient: ApiRoot;

    @inject('amqp.url')
    private amqpUrl: string;

    @inject('amqp.port')
    private amqpPort: string;

    @inject('amqp.user')
    private amqpUser: string;

    @inject('amqp.pwd')
    private amqpPwd: string;

    @inject('amqp.conn')
    private amqpConn: Connection;

    @inject('queue.node.ready')
    private nodeReadyQueue: string;

    async startTestPod(job: Job, task: Task, totalSimulatedUsers: number) {

        // To enable testing we need this environment variable set in the test
        const id = process.env.NODE_ID || uuid();

        await this.kubernetesClient.api.v1.namespaces('default').pod.post({
            body: {
                kind: "Pod",
                apiVersion: "v1",
                metadata: {
                    labels: {
                        app: "ws-flare-test-client"
                    },
                    name: `ws-flare-test-client-${id}`
                },
                spec: {
                    containers: [
                        {
                            name: `ws-flare-test-client-${id}`,
                            image: this.testImage,
                            ports: [
                                {
                                    containerPort: 80
                                }
                            ],
                            env: [
                                {
                                    name: "TASK_ID",
                                    value: `${task.id}`
                                },
                                {
                                    name: "JOB_ID",
                                    value: `${job.id}`
                                },
                                {
                                    name: 'NODE_ID',
                                    value: `${id}`
                                },
                                {
                                    name: "JOBS_API",
                                    value: `${this.jobsApi}`
                                },
                                {
                                    name: "URI",
                                    value: `${task.uri}`
                                },
                                {
                                    name: "TOTAL_SIMULATED_USERS",
                                    value: `${totalSimulatedUsers}`
                                },
                                {
                                    name: 'RUN_TIME',
                                    value: `${task.runTime}`
                                },
                                {
                                    name: "AMQP_URL",
                                    value: `${this.amqpUrl}`
                                },
                                {
                                    name: "AMQP_PORT",
                                    value: `${this.amqpPort}`
                                },
                                {
                                    name: "AMQP_USER",
                                    value: `${this.amqpUser}`
                                },
                                {
                                    name: "AMQP_PWD",
                                    value: `${this.amqpPwd}`
                                },
                                {
                                    name: "NODE_NAME",
                                    value: `ws-flare-test-client-${id}`
                                }
                            ],
                            resources: {
                                requests: {
                                    cpu: '500m'
                                }
                            }
                        }
                    ]
                }
            }
        });

        await this.waitForPodToStart(id);
    }

    private async waitForPodToStart(nodeId: string) {
        const nodeReadyChannel = await this.amqpConn.createChannel();
        const queue = `${this.nodeReadyQueue}.${nodeId}`;

        await nodeReadyChannel.assertQueue(queue);

        await new Promise((resolve) => {
            nodeReadyChannel.consume(queue, () => {
                nodeReadyChannel.close().then(() => resolve());
            }, {noAck: true});
        });
    }
}
