import { connect, Connection } from 'amqplib';
import { retry } from 'async';
import * as mock from 'mock-fs';
import { readFileSync } from 'fs-extra';

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

export function setupK8sConfig() {
    mock({
        '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt': 'my-ca',
        '/var/run/secrets/kubernetes.io/serviceaccount/token': 'my-token',
        '/var/run/secrets/kubernetes.io/serviceaccount/namespace': 'my-namespace',
        'node_modules/kubernetes-client/lib/specs/swagger-1.10.json.gz': readFileSync('./node_modules/kubernetes-client/lib/specs/swagger-1.10.json.gz'),
        'node_modules/winston/lib/winston/transports/console.js': readFileSync('./node_modules/winston/lib/winston/transports/console.js'),
        'node_modules/readable-stream/lib': {
            '_stream_duplex.js': readFileSync('./node_modules/readable-stream/lib/_stream_duplex.js'),
            '_stream_readable.js': readFileSync('./node_modules/readable-stream/lib/_stream_readable.js')
        },
        'node_modules/for-own': {
            'index.js': readFileSync('./node_modules/for-own/index.js')
        },
        'node_modules/shallow-clone': {
            'index.js': readFileSync('./node_modules/shallow-clone/index.js'),
            'utils.js': readFileSync('./node_modules/shallow-clone/utils.js'),
        },
        'node_modules/shallow-clone/node_modules': {},
        'node_modules/shallow-clone/node_modules/lazy-cache': {
            'index.js': readFileSync('./node_modules/shallow-clone/node_modules/lazy-cache/index.js')
        },
        'node_modules/shallow-clone/node_modules/kind-of': {
            'index.js': readFileSync('./node_modules/shallow-clone/node_modules/kind-of/index.js')
        }
    });
}

export function restoreFS() {
    mock.restore()
}
