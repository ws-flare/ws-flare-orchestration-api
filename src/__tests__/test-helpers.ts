import { connect, Connection } from 'amqplib';
import { retry } from 'async';

let {Docker} = require('node-docker-api');
let getRandomPort = require('random-port-as-promised');

export interface Container {
    stop: Function;
    start: Function;
    status: Function;
}

export const apis = {
    userApi: 'http://user.com',
    projectsApi: 'http://projects.com',
    jobsApi: 'http://jobs.com'
};

export async function startMqContainer(): Promise<{ container: Container, port: number }> {
    const docker = new Docker({socketPath: '/var/run/docker.sock'});
    const port = await getRandomPort();

    const container = await docker.container.create({
        Image: 'rabbitmq',
        host: '127.0.0.1',
        port: port,
        HostConfig: {
            PortBindings: {
                '5672/tcp': [
                    {
                        HostPort: `${port}`
                    }
                ]
            }
        }
    });

    await container.start();

    await new Promise((resolve) => {
        retry({times: 20, interval: 3000}, done => {
            console.log('Trying to connect to rabbitmq');
            return getAMQPConn(port)
                .then((conn) => {
                    conn.close();
                    done();
                })
                .catch(() => done(new Error('Error!')));
        }, () => resolve());
    });

    console.log('Connected to rabbitMQ');

    return {container, port};
}

export async function getAMQPConn(port: number): Promise<Connection> {
    const AMQP_URL = 'localhost';
    const AMQP_USER = 'guest';
    const AMQP_PWD = 'guest';

    process.env.AMQP_URL = AMQP_URL;
    process.env.AMQP_USER = AMQP_USER;
    process.env.AMQP_PWD = AMQP_PWD;

    return connect({hostname: AMQP_URL, port, username: AMQP_USER, password: AMQP_PWD});
}
