# ws-flare-orchestration-api

[![Coverage Status](https://coveralls.io/repos/github/ws-flare/ws-flare-orchestration-api/badge.svg?branch=master)](https://coveralls.io/github/ws-flare/ws-flare-orchestration-api?branch=master)

### Installation

Make sure you have Yarn package manager for NodeJS installed

Use the command below to install dependencies.

```
yarn install
```

### Tests

You need to have docker installed before running tests. 

Before running tests make sure you have pulled the rabbitmq docker image using the command below

```
docker pull rabbitmq
```

next run the following command to run the tests

```
yarn test
```