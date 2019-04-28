import {inject} from '@loopback/core';
import {JobsService} from './jobs.service';
import {Task} from '../models/Task.model';
import {Job} from '../models/Job.model';
import {Logger} from 'winston';

export class ResultsService {

    @inject('logger')
    private logger: Logger;

    @inject('services.jobs')
    private jobsService: JobsService;

    async calculateResults(task: Task, job: Job) {
        this.logger.info('Calculating results');
        const nodes = await this.jobsService.getNodes(job.id);

        let totalSimulators = 0;
        let totalSuccessfulConnections = 0;

        this.logger.info(task.scripts);

        task.scripts.map(script => totalSimulators += script.totalSimulators);

        nodes.map(node => totalSuccessfulConnections += node.totalSuccessfulConnections);

        this.logger.info(`${totalSimulators}`);

        const threshold = (totalSimulators / 100) * task.successThreshold;

        this.logger.info(`Threshold is ${threshold}`);

        const passed = totalSuccessfulConnections >= threshold;

        await this.jobsService.updateJob({...job, passed, isRunning: false});

        return passed;
    }
}