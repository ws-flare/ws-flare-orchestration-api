import * as uuid from 'uuid/v4';
import { inject } from '@loopback/core';
import { Task } from '../models/Task.model';
import ApiRoot = KubernetesClient.ApiRoot;
import { Job } from '../models/Job.model';

export class KubernetesService {

    @inject('config.kubernetes.testImage')
    private testImage: string;

    @inject('apis.jobs')
    private jobsApi: string;

    @inject('kubernetes.client')
    private kubernetesClient: ApiRoot;

    async startTestPod(job: Job, task: Task) {
        const id = uuid();

        await this.kubernetesClient.api.v1.namespaces('default').pod.post({
            body: {
                "kind": "Pod",
                "apiVersion": "v1",
                "metadata": {
                    "labels": {
                        "app": "ws-flare-test-client"
                    },
                    "name": `ws-flare-test-client-${id}`
                },
                "spec": {
                    "containers": [
                        {
                            "name": `ws-flare-test-client-${id}`,
                            "image": this.testImage,
                            "ports": [
                                {
                                    "containerPort": 80
                                }
                            ],
                            "env": [
                                {
                                    "name": "TASK_ID",
                                    "value": task.id
                                },
                                {
                                    "name": "JOB_ID",
                                    "value": job.id
                                },
                                {
                                    "name": "JOBS_API",
                                    "value": this.jobsApi
                                },
                                {
                                    "name": "TOTAL_SIMULATED_USERS",
                                    "value": task.totalSimulatedUsers
                                }
                            ]
                        }
                    ]
                }
            }
        });
    }
}
