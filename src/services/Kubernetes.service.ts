import * as uuid from 'uuid/v4';
import { inject } from '@loopback/core';
import { Task } from '../models/Task.model';
import { Job } from '../models/Job.model';
import { Connection } from 'amqplib';
import ApiRoot = KubernetesClient.ApiRoot;

export class KubernetesService {

    @inject('config.kubernetes.testImage')
    private testImage: string;

    @inject('config.kubernetes.cfMonitorImage')
    private cfMonitorImage: string;

    @inject('api.jobs')
    private jobsApi: string;

    @inject('api.monitor')
    private monitorApi: string;

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

    @inject('queue.cfMonitor.ready')
    private cfMonitorReadyQueue: string;

    async startTestPod(job: Job, totalSimulators: number, scriptIndex: number) {
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
                                    name: 'TOTAL_SIMULATORS',
                                    value: `${totalSimulators}`
                                },
                                {
                                    name: "SCRIPT_INDEX",
                                    value: `${scriptIndex}`
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
                                    cpu: '100m'
                                }
                            }
                        }
                    ]
                }
            }
        });

        await this.waitForPodToStart(id);
    }

    async startCloudFoundryMonitor(job: Job, task: Task) {
        // To enable testing we need this environment variable set in the test
        const id = process.env.NODE_ID || uuid();

        await this.kubernetesClient.api.v1.namespaces('default').pod.post({
            body: {
                kind: "Pod",
                apiVersion: "v1",
                metadata: {
                    labels: {
                        app: "ws-flare-cf-monitor"
                    },
                    name: `ws-flare-cf-monitor-${id}`
                },
                spec: {
                    containers: [
                        {
                            name: `ws-flare-cf-monitor-${id}`,
                            image: this.cfMonitorImage,
                            ports: [
                                {
                                    containerPort: 80
                                }
                            ],
                            env: [
                                {
                                    name: "JOB_ID",
                                    value: `${job.id}`
                                },
                                {
                                    name: 'CF_MONITOR_ID',
                                    value: `${id}`
                                },
                                {
                                    name: "JOBS_API",
                                    value: `${this.jobsApi}`
                                },
                                {
                                    name: "MONITOR_API",
                                    value: `${this.monitorApi}`
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
                                    name: 'CF_API',
                                    value: `${task.cfApi}`
                                },
                                {
                                    name: 'CF_USER',
                                    value: `${task.cfUser}`
                                },
                                {
                                    name: 'CF_PASS',
                                    value: `${task.cfPass}`
                                },
                                {
                                    name: 'CF_ORG',
                                    value: `${task.cfOrg}`
                                },
                                {
                                    name: 'CF_SPACE',
                                    value: `${task.cfSpace}`
                                },
                                {
                                    name: 'CF_APPS',
                                    value: `${task.cfApps}`
                                },
                                {
                                    name: "POD_NAME",
                                    value: `ws-flare-cf-monitor-${id}`
                                }
                            ],
                            resources: {
                                requests: {
                                    cpu: '100m'
                                }
                            }
                        }
                    ]
                }
            }
        });

        await this.waitForCfMonitorToStart(id);
    }

    private async waitForPodToStart(nodeId: string) {
        const nodeReadyChannel = await this.amqpConn.createChannel();
        const queue = `${this.nodeReadyQueue}.${nodeId}`;

        await nodeReadyChannel.assertQueue(queue);

        await new Promise(async (resolve) => {
            await nodeReadyChannel.consume(queue, () => {
                nodeReadyChannel.close().then(() => resolve());
            }, {noAck: true});
        });
    }

    private async waitForCfMonitorToStart(cfMonitorId: string) {
        const nodeReadyChannel = await this.amqpConn.createChannel();

        const queue = `${this.cfMonitorReadyQueue}.${cfMonitorId}`;

        await nodeReadyChannel.assertQueue(queue);

        await new Promise(async (resolve) => {
            await nodeReadyChannel.consume(queue, () => {
                nodeReadyChannel.close().then(() => resolve());
            }, {noAck: true});
        });
    }
}
