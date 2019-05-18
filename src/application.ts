import {Client1_10, config} from 'kubernetes-client';
import {Application, ApplicationConfig} from '@loopback/core';
import {connect} from 'amqplib';
import {Server} from './server';
import {NodesService} from './services/Nodes.service';
import {KubernetesService} from './services/Kubernetes.service';
import {ResultsService} from './services/results.service';
import {JobsService} from './services/jobs.service';
import {createLogger, transports} from 'winston';

/**
 * Bootstraps the loopback application and sets up dependency injection
 */
export class OrchestrationApplication extends Application {

    constructor(options: ApplicationConfig = {}) {
        super(options);

        this.options.port = this.options.port || 3000;

        this.server(Server);

        const logger = createLogger({
            transports: [
                new transports.Console(),
            ],
        });

        // Logger
        this.bind('logger').to(logger);

        // Config
        this.bind('config.nodes.connectionLimitPerNode').to(1000);
        this.bind('config.kubernetes.testImage').to(options.kubernetes.testImage);
        this.bind('config.kubernetes.cfMonitorImage').to(options.kubernetes.cfMonitorImage);

        // Services
        this.bind('services.nodes').toClass(NodesService);
        this.bind('services.kubernetes').toClass(KubernetesService);
        this.bind('services.results').toClass(ResultsService);
        this.bind('services.jobs').toClass(JobsService);

        // Remote APIS
        this.bind('api.user').to(options.apis.userApi);
        this.bind('api.projects').to(options.apis.projectsApi);
        this.bind('api.jobs').to(options.apis.jobsApi);
        this.bind('api.monitor').to(options.apis.monitorApi);

        // AMQP
        this.bind('amqp.url').to(options.amqp.url);
        this.bind('amqp.port').to(options.amqp.port);
        this.bind('amqp.user').to(options.amqp.user);
        this.bind('amqp.pwd').to(options.amqp.pwd);
        this.bind('amqp.conn').toDynamicValue(async () => await connect({
            hostname: options.amqp.url,
            port: options.amqp.port,
            username: options.amqp.user,
            password: options.amqp.pwd
        }));

        // Queues
        this.bind('queue.job.create').to('job.create');
        this.bind('queue.job.complete').to('job.complete');
        this.bind('queue.node.ready').to('node.ready');
        this.bind('queue.node.complete').to('node.complete');
        this.bind('queue.cfMonitor.ready').to('cfMonitor.ready');

        // Exchanges
        this.bind('exchange.job.start').to('job.start');

        // Kubernetes
        this.bind('kubernetes.client').to(new Client1_10({config: config.getInCluster()}));
    }

}
