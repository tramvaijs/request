import { Context, Status } from '@tinkoff/request-core';
import http from './http';

const fetch = jest.spyOn(globalThis, 'fetch');
const plugin = http();
const next = jest.fn();

const createResponse = (body: Record<string, any>, init: ResponseInit = {}): Promise<Response> => {
    return Promise.resolve(
        new Response(JSON.stringify(body), {
            status: 200,
            ...init,
        })
    );
};

describe('plugins/http', () => {
    beforeEach(() => {
        (fetch as any).mockReset();
        next.mockClear();
    });

    it('request get', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body, {
            headers: { 'content-type': 'application/json' },
        });

        (fetch as any).mockReturnValueOnce(mockResponse);

        plugin.init!(new Context({ request: { url: 'test' } }), next, null as any);

        jest.runAllTimers();

        expect(fetch as any).toHaveBeenCalledWith('http://test', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
            },
            signal: expect.anything(),
        });

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(next).toHaveBeenLastCalledWith({
            response: body,
            status: Status.COMPLETE,
        });
    });

    it('request attaches', async () => {
        const mockResponse = createResponse({ body: '' });
        const payload = {
            key: 'value',
        };
        const attaches = [
            { name: 'file1' },
            { name: 'file2' },
            Object.assign(new Blob(), {
                on: () => {},
                pause: () => {},
                resume: () => {},
                name: 'file3',
            }),
        ];

        (fetch as any).mockReturnValue(mockResponse);

        plugin.init!(
            new Context({
                request: {
                    payload,
                    attaches,
                    url: 'attaches',
                    httpMethod: 'PUT',
                },
            }),
            next,
            null as any
        );
        plugin.init!(
            new Context({
                request: {
                    payload,
                    attaches,
                    url: 'attaches',
                    httpMethod: 'POST',
                    encodeFileName: true,
                },
            }),
            next,
            null as any
        );

        await new Promise((res) => {
            next.mockImplementation(res);
        });
    });

    it('error request', async () => {
        const body = { a: '1', b: 2 };
        const mockResponse = createResponse(body, {
            status: 503,
            headers: {
                'Content-type': 'application/json;',
            },
        });
        (fetch as any).mockReturnValueOnce(mockResponse);

        plugin.init!(new Context({ request: { url: 'test' } }), next, null as any);

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(next).toHaveBeenCalledWith({
            status: Status.ERROR,
            error: expect.objectContaining({
                code: 'ERR_HTTP_ERROR',
                message: 'Unsuccessful HTTP response',
                status: 503,
                body,
            }),
            response: body,
        });
    });

    it('request unknown error', async () => {
        const mockResponse = Promise.reject(new TypeError('Failed to (fetch as any)'));

        (fetch as any).mockReturnValueOnce(mockResponse);

        plugin.init!(new Context({ request: { url: 'test' } }), next, null as any);

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(next).toHaveBeenLastCalledWith({
            status: Status.ERROR,
            error: new TypeError('Failed to (fetch as any)'),
        });
    });

    it('request with custom http agent', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body, {
            headers: {
                'Content-type': 'application/json;',
            },
        });
        (fetch as any).mockReturnValueOnce(mockResponse);

        class MockedAgent {
            dispatch() {}
        }

        const mockedAgent = new MockedAgent();

        http({ agent: { http: mockedAgent as any, https: undefined as any } }).init?.(
            new Context({
                request: {
                    url: 'http://test.com/api',
                    headers: {
                        'Content-type': 'application/json',
                    },
                },
            }),
            next,
            null as any
        );

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(fetch as any).toHaveBeenCalledWith('http://test.com/api', {
            dispatcher: mockedAgent,
            method: 'GET',
            credentials: 'same-origin',
            body: undefined,
            headers: {
                'Content-type': 'application/json',
            },
            signal: expect.anything(),
        });

        expect(next).toHaveBeenLastCalledWith({
            response: body,
            status: Status.COMPLETE,
        });
    });

    it('request with custom https agent', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body, {
            headers: {
                'Content-type': 'application/json',
            },
        });
        (fetch as any).mockReturnValueOnce(mockResponse);

        class MockedAgent {
            dispatch() {}
        }

        const mockedAgent = new MockedAgent();

        http({ agent: { http: undefined as any, https: mockedAgent as any } }).init?.(
            new Context({
                request: {
                    url: 'https://test.com/api',
                    headers: {
                        'Content-type': 'application/json',
                    },
                },
            }),
            next,
            null as any
        );

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(fetch as any).toHaveBeenCalledWith('https://test.com/api', {
            dispatcher: mockedAgent,
            method: 'GET',
            credentials: 'same-origin',
            body: undefined,
            headers: {
                'Content-type': 'application/json',
            },
            signal: expect.anything(),
        });

        expect(next).toHaveBeenLastCalledWith({
            response: body,
            status: Status.COMPLETE,
        });
    });

    it('request with custom querySerializer', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body, {
            headers: {
                'Content-type': 'application/json;',
            },
        });
        (fetch as any).mockReturnValueOnce(mockResponse);

        const mockQuerySerializer = jest.fn(() => 'query-string');

        http({ querySerializer: mockQuerySerializer }).init?.(
            new Context({ request: { url: 'http://test.com/api?test=123', query: { a: '1' } } }),
            next,
            null as any
        );

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(mockQuerySerializer).toHaveBeenCalledWith({ a: '1' }, 'test=123');
    });

    it('plugin should call next function once after aborting', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body);
        let abort;

        (fetch as any).mockReturnValueOnce(mockResponse);

        plugin.init!(
            new Context({
                request: {
                    url: 'http://test.com/api',
                    abortPromise: new Promise((res) => {
                        abort = res;
                    }),
                },
            }),
            next,
            null as any
        );

        abort('abort test');

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenLastCalledWith({
            error: expect.objectContaining({
                code: 'ABORT_ERR',
                abortOptions: 'abort test',
            }),
            status: Status.ERROR,
        });
    });

    it('plugin should accept signal that can abort request', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body);

        (fetch as any).mockReturnValueOnce(mockResponse);

        const abortController = new AbortController();

        plugin.init!(
            new Context({
                request: {
                    url: 'http://test.com/api',
                    signal: abortController.signal,
                },
            }),
            next,
            null as any
        );
        const promise = new Promise((res) => {
            next.mockImplementation(res);
        });

        abortController.abort();

        await promise;

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenLastCalledWith({
            error: expect.objectContaining({
                code: 'ABORT_ERR',
            }),
            status: Status.ERROR,
        });
    });

    it('abort should do nothing after request ended', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body, {
            headers: {
                'Content-type': 'application/json;',
            },
        });
        let abort;

        (fetch as any).mockReturnValueOnce(mockResponse);

        plugin.init!(
            new Context({
                request: {
                    url: 'http://test.com/api',
                    abortPromise: new Promise((res) => {
                        abort = res;
                    }),
                },
            }),
            next,
            null as any
        );

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        abort('abort after');

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenLastCalledWith({
            response: body,
            status: Status.COMPLETE,
        });
    });

    it('should convert httpMethod to uppercase', async () => {
        const body = { a: 3 };
        const mockResponse = createResponse(body, {
            headers: {
                'Content-type': 'application/json;',
            },
        });

        (fetch as any).mockReturnValueOnce(mockResponse);

        plugin.init!(new Context({ request: { url: 'method-patch', httpMethod: 'patch' } }), next, null as any);

        jest.runAllTimers();

        expect(fetch as any).toHaveBeenCalledWith('http://method-patch', {
            method: 'PATCH',
            credentials: 'same-origin',
            body: '',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
            },
            signal: expect.anything(),
        });

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(next).toHaveBeenLastCalledWith({
            response: body,
            status: Status.COMPLETE,
        });
    });

    it('timeout', async () => {
        const body = { a: 1 };
        const mockResponse = new Promise((resolve) => {
            setTimeout(() => {
                resolve(
                    new Response(JSON.stringify(body), {
                        status: 200,
                    })
                );
            }, 2000);
        });

        (fetch as any).mockReturnValueOnce(mockResponse as any);

        plugin.init!(new Context({ request: { url: 'timeout', timeout: 500 } }), next, null as any);

        jest.runAllTimers();

        expect(next).toHaveBeenLastCalledWith({
            error: expect.objectContaining({
                code: 'ERR_HTTP_REQUEST_TIMEOUT',
                message: 'Request timed out',
            }),
            status: Status.ERROR,
        });
    });

    it('internal timeout', async () => {
        const mockResponse = Promise.reject(
            Object.assign(new Error('network timeout at: timeout'), {
                type: 'request-timeout',
            })
        );

        (fetch as any).mockReturnValueOnce(mockResponse);

        plugin.init!(new Context({ request: { url: 'timeout' } }), next, null as any);

        jest.runAllTimers();

        await new Promise((res) => {
            next.mockImplementation(res);
        });

        expect(next).toHaveBeenLastCalledWith({
            error: expect.objectContaining({
                code: 'ERR_HTTP_REQUEST_TIMEOUT',
                message: 'Request timed out',
            }),
            status: Status.ERROR,
        });
    });
});
