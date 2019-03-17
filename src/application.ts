import { Application, ApplicationConfig } from '@loopback/core';
import { createLogger, transports } from 'winston';
import { connect } from 'amqplib';
import { Server } from './server';

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

        // Jwt
        this.bind('jwt.secret').to(options.jwt.secret);

        // Server Options
        this.bind('server.port').to(this.options.port);

        // Services

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

    }

}
