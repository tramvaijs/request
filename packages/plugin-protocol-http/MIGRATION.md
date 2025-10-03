# Migrations

## 0.14.0

## `02.09.2025`

Now `@tinkoff/request` uses the native Node.js fetch implementation — `undici` instead of `node-fetch`. As a result, a number of breaking changes have been introduced:

- Removed node-fetch and the abort-controller polyfill

- Minimum supported Node.js version is now 18+

- The signature of a custom Agent for requests has changed — it is now an undici `dispatcher`

### Undici Agent

The biggest change is the updated Agent signature. Undici has a different set of parameters and default settings.

Now, instead of using http.Agent/https.Agent, use Agent from undici:

```ts
import { Agent } from 'undici';

const options = {
  connections: 10
};

http({
  agent: {
    http: new Agent(options),
    https: new Agent(options)
  }
})
```

**Caution: you need to install undici separately**

The Agent has no keepAlive option — undici enables keep-alive by default. Also Agent is unified for http/https requests.

Documentation links:

[Example of custom agent usage](https://undici.nodejs.org/#/examples/?id=using-interceptors-to-add-response-caching-dns-lookup-caching-and-connection-retries).

[Agent parameters](https://undici.nodejs.org/#/docs/api/Client?id=parameter-clientoptions).

### Headers interface

Previously, node-fetch shipped with a [custom implementation](https://github.com/node-fetch/node-fetch/blob/v2.7.0/src/headers.js) of the `Headers` interface, which included several non-standard, spec-incompatible methods.

These methods are no longer supported, as the library now relies on the native `Headers` interface.

### Headers with the same name

The behavior for combining multiple headers with the same name has changed.

`node-fetch` returned an array of values.

The native Headers interface returns a single string, with values joined by `, `.

As a result, header values are always of type `string` now.

### Undici version

The library now explicitly uses fetch from undici.

undici has been moved to `peerDependencies`, so you must install it yourself when using `tinkoff/request`.

Choose an undici version compatible with your Node.js runtime (check `engine` field in package.json of required undici version).

### Jest

In jest-environment-jsdom there is no fetch. Use jsdom patching with undici’s fetch, as it is the most spec-compatible:

```ts
// FixJSDOMEnvironment.ts

import JSDOMEnvironment from 'jest-environment-jsdom';

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class FixJSDOMEnvironment extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
    super(...args);

    // FIXME https://github.com/jsdom/jsdom/issues/1724
    this.global.fetch = fetch;
    this.global.Headers = Headers;
    this.global.Request = Request;
    this.global.Response = Response;
  }
```

```ts
// jest.config.js

/** @type {import('jest').Config} */
const config = {
  testEnvironment: './FixJSDOMEnvironment.ts',

  ...
}

module.exports = config;
```

For mocks in Jest tests, use `jest.spyOn()`:

```ts
const fetch = jest.spyOn(globalThis, 'fetch');

it('some test', () => {
    (fetch as any).mockImplementation(() =>
      createJsonResponse({
        resultCode: 'OK',
        payload: 'payload',
      })
    );

    const url = 'http://localhost:3000';
    // Some actions

    expect(fetch).toHaveBeenCalledTimes(1);

    const request = (fetch as any).mock.calls[0];
    expect(request[0]).toEqual(url);
});
```
