import { CoreBindings, Application } from '@loopback/core';
import { Context, inject } from '@loopback/context';
import { Logger } from 'winston';
import * as http from 'http';
import { Connection, ConsumeMessage } from 'amqplib';
import { NodesService } from './services/Nodes.service';

export class Server extends Context implements Server {
    private _listening: boolean = false;
    private server: http.Server;

    @inject('logger')
    public logger: Logger;

    @inject('amqp.conn')
    public amqpConn: Connection;

    @inject('channel.job.create')
    public createJobQueue: string;

    @inject('services.nodes')
    public nodesService: NodesService;

    constructor(@inject(CoreBindings.APPLICATION_INSTANCE) public app?: Application) {
        super(app);
    }

    get listening() {
        return this._listening;
    }

    async start(): Promise<void> {
        const createJobChannel = await this.amqpConn.createChannel();

        await createJobChannel.assertQueue(this.createJobQueue);

        await createJobChannel.consume(this.createJobQueue, async (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());

            await this.nodesService.runTest(parsed.job, parsed.task);
        }, {noAck: true});
    }

    async stop(): Promise<void> {
        await this.server.close();
    }
}
