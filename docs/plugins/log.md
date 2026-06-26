---
id: log
title: Log Plugin
sidebar_label: Log
---

Logs request events and timing

## Parameters

### Create options 
- `name`: string [=''] - string used as logger name, passed to logger
- `logger`: function [() => console] - logger factory
- `showQueryFields`: boolean | string[] [=false] - whether the plugin should show request query values.
- `showPayloadFields`: boolean | string[] [=false] - whether the plugin should show request payload values.
- `extensions`: LogExtension[] [=[]] - array of functions to enrich log objects. Each extension receives the log object and the plugin context, and must return a new log object. Extensions are applied sequentially in all hooks (init, complete, error).

### Request params
- `silent`: boolean [=false] - if set info and error level logs will be ignored and only debug level enabled. 
- `showQueryFields`: boolean | string[] [=false] - whether the plugin should show request query values.
- `showPayloadFields`: boolean | string[] [=false] - whether the plugin should show request payload values.

### External meta
- `log.start`: number - request start Date.now()
- `log.end`: number - request end Date.now()
- `log.duration`: number - request duration (end - start)

## Example
```typescript
import request from '@tinkoff/request-core';
import log from '@tinkoff/request-plugin-log';

const req = request([
    // should be set first at most cases to enable logging for every requests, despite caching or other plugins logic
    log(),
    // ...other plugins
]);
```

## Extensions

Extensions allow you to enrich log objects with additional data. Each extension is a function that receives the current log object and the plugin context, and returns a new log object. Extensions are applied sequentially to all hooks (init, complete, error).

```typescript
import request from '@tinkoff/request-core';
import log from '@tinkoff/request-plugin-log';
import type { LogExtension } from '@tinkoff/request-plugin-log';

const addRequestId: LogExtension = (logObj, context) => {
    const req = context.getRequest();

    return {
        ...logObj,
        requestId: req.headers?.['x-request-id'],
    };
};

const makeRequest = request([
    log({
        extensions: [addRequestId],
    }),
    // ...other plugins
]);
```
