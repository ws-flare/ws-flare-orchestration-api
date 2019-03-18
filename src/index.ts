import { ApplicationConfig } from '@loopback/core';
import { OrchestrationApplication } from './application';

const {PORT, USER_API, PROJECTS_API, JOBS_API, AMQP_URL, AMQP_PORT, AMQP_USER, AMQP_PWD, TEST_IMAGE} = process.env;

export async function main(options: ApplicationConfig = {}): Promise<OrchestrationApplication> {
    options.port = options.port || PORT;
    options.apis = {
        userApi: USER_API,
        projectsApi: PROJECTS_API,
        jobsApi: JOBS_API
    };
    options.amqp = {
        url: AMQP_URL,
        port: (options.amqp || {}).port || AMQP_PORT,
        user: AMQP_USER,
        pwd: AMQP_PWD
    };
    options.kubernetes = {
        testImage: TEST_IMAGE
    };

    const app = new OrchestrationApplication(options);

    await app.start();

    console.log(`Server is running on port ${app.options.port}`);
    return app;
}
