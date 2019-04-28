import {inject} from '@loopback/core';
import {get, patch} from 'superagent';
import {Node} from '../models/node.model';
import {Job} from '../models/Job.model';

export class JobsService {

    @inject('api.jobs')
    private jobsApi: string;

    async getNodes(jobId: string): Promise<Node[]> {
        const res = await get(`${this.jobsApi}/nodes?filter=${JSON.stringify({where: {jobId}})}`);

        return res.body;
    }

    async updateJob(job: Job) {
        await patch(`${this.jobsApi}/jobs/${job.id}`).send(job);
    }
}