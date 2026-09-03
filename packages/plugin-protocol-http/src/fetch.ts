import { RequestInit, RequestInfo, fetch as undiciFetch } from 'undici';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

// undici accepts `priority` but doesn't act on it (no-op in Node); types just don't declare it.
declare module 'undici' {
    interface RequestInit {
        priority?: 'auto' | 'high' | 'low';
    }
}

const fetch = (input: RequestInfo, init?: RequestInit) => {
    return undiciFetch(input, init);
};

const { Headers, Request, Response } = globalThis;

export { fetch, Headers, Request, Response, HttpAgent, HttpsAgent };
