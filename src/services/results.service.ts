import {inject} from '@loopback/core';
import {JobsService} from './jobs.service';
import {Task} from '../models/Task.model';
import {Job} from '../models/Job.model';
import {Logger} from 'winston';

/**
 * Service for determining if a test run has passed or failed
 */
export class ResultsService {

    @inject('logger')
    private logger: Logger;

    @inject('services.jobs')
    private jobsService: JobsService;

    /**
     * Determines if a test has passed or failed and stores the results
     * @param task - The task which will contain the threshold of required successful connection to pass the test
     * @param job - The running job
     */
    async calculateResults(task: Task, job: Job) {
        this.logger.info('Calculating results');

        // Gets the results of all nodes from the jobs service
        const nodes = await this.jobsService.getNodes(job.id);

        let totalSimulators = 0;
        let totalSuccessfulConnections = 0;

        this.logger.info(task.scripts);

        task.scripts.map(script => totalSimulators += script.totalSimulators);

        // Sums up all the successful connections
        nodes.map(node => totalSuccessfulConnections += node.totalSuccessfulConnections);

        this.logger.info(`${totalSimulators}`);

        // Determine the threshold
        const threshold = (totalSimulators / 100) * task.successThreshold;

        this.logger.info(`Threshold is ${threshold}`);

        // Check if the threshold is met which determines if the test passes or fails
        const passed = totalSuccessfulConnections >= threshold;

        await this.jobsService.updateJob({...job, passed, isRunning: false});

        return passed;
    }
}