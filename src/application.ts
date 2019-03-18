import { Client1_10, config } from 'kubernetes-client';
import { Application, ApplicationConfig } from '@loopback/core';
import { createLogger, transports } from 'winston';
import { connect } from 'amqplib';
import { Server } from './server';
import { NodesService } from './services/Nodes.service';
import { KubernetesService } from './services/Kubernetes.service';

export class GraphqlApplication extends Application {

    constructor(options: ApplicationConfig = {}) {
        super(options);

        this.options.port = this.options.port || 3000;

        const logger = createLogger({
            transports: [
                new transports.Console(),
            ],
        });

        this.server(Server);

        // Logger
        this.bind('logger').to(logger);

        // Config
        this.bind('config.nodes.connectionLimitPerNode').to(1000);
        this.bind('config.kubernetes.testImage').to(options.kubernetes.testImage)

        // Services
        this.bind('services.nodes').toClass(NodesService);
        this.bind('services.kubernetes').toClass(KubernetesService);

        // Remote APIS
        this.bind('api.user').to(options.apis.userApi);
        this.bind('api.projects').to(options.apis.projectsApi);
        this.bind('api.jobs').to(options.apis.jobsApi);

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

        // Channels
        this.bind('channel.job.create').to('job.create');

        // Kubernetes
        this.bind('kubernetes.client').to(new Client1_10({config: config.getInCluster()}));

    }

}
