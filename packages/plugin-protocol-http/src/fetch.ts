import { RequestInit, RequestInfo, fetch as undiciFetch } from 'undici';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

const fetch = (input: RequestInfo, init?: RequestInit) => {
    return undiciFetch(input, init);
};

const { Headers, Request, Response } = globalThis;

export { fetch, Headers, Request, Response, HttpAgent, HttpsAgent };
