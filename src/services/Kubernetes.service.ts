import * as uuid from 'uuid/v4';
import { inject } from '@loopback/core';
import { retry } from 'async';
import { Task } from '../models/Task.model';
import { Job } from '../models/Job.model';
import ApiRoot = KubernetesClient.ApiRoot;

export class KubernetesService {

    @inject('config.kubernetes.testImage')
    private testImage: string;

    @inject('api.jobs')
    private jobsApi: string;

    @inject('kubernetes.client')
    private kubernetesClient: ApiRoot;

    @inject('amqp.url')
    amqpUrl: string;

    @inject('amqp.port')
    amqpPort: string;

    @inject('amqp.user')
    amqpUser: string;

    @inject('amqp.pwd')
    amqpPwd: string;

    async startTestPod(job: Job, task: Task) {
        const id = uuid();

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
                                    name: "JOBS_API",
                                    value: `${this.jobsApi}`
                                },
                                {
                                    name: "TOTAL_SIMULATED_USERS",
                                    value: `${task.totalSimulatedUsers}`
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
                                }
                            ]
                        }
                    ]
                }
            }
        });

        await this.waitForPodToStart(`ws-flare-test-client-${id}`);
    }

    private async waitForPodToStart(podName: string) {
        await new Promise((resolve) => {
            retry({times: 100, interval: 2000}, done => {

                console.log('Waiting for pod to start');

                this.kubernetesClient.api.v1.namespaces('default').pod(podName).status.get()
                    .then((response: any) => {
                        console.log(response.body.status);
                        const complete = response.body.status.phase === 'Running';

                        done(complete ? null : new Error('Test pod not yet ready'));
                    });

            }, () => resolve());
        });
    }
}
