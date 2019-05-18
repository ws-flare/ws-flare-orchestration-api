import {inject} from '@loopback/core';
import {get, patch} from 'superagent';
import {Node} from '../models/node.model';
import {Job} from '../models/Job.model';

/**
 * Service for handling communication to the jobs api service
 */
export class JobsService {

    @inject('api.jobs')
    private jobsApi: string;

    /**
     * Get nodes from the jobs api service
     *
     * @param jobId - THe job id to filter by
     */
    async getNodes(jobId: string): Promise<Node[]> {
        const res = await get(`${this.jobsApi}/nodes?filter=${JSON.stringify({where: {jobId}})}`);

        return res.body;
    }

    /**
     * Updates a job on the jobs api service
     *
     * @param job - The job to update to
     */
    async updateJob(job: Job) {
        await patch(`${this.jobsApi}/jobs/${job.id}`).send(job);
    }
}