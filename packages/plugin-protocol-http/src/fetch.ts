import { RequestInit, RequestInfo, fetch as undiciFetch } from 'undici';

const fetch = (input: RequestInfo, init?: RequestInit) => {
    return undiciFetch(input, init);
};

const { Headers, Request, Response } = globalThis;

export { fetch, Headers, Request, Response };
