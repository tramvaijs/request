import { Context, Status } from '@tinkoff/request-core';
import { metaTypes } from '@tinkoff/request-cache-utils';
import memoryCache from './memory';

const mockLru = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    peek: jest.fn(),
};

jest.mock(
    '@tinkoff/lru-cache-nano',
    () =>
        function () {
            return mockLru;
        }
);

const getCacheKey = jest.fn((req) => req.url);
const plugin = memoryCache({ getCacheKey });
const next = jest.fn();
const context = new Context({ request: { url: 'test' } });

context.updateExternalMeta = jest.fn(context.updateExternalMeta.bind(context));
context.updateInternalMeta = jest.fn(context.updateInternalMeta.bind(context));

describe('plugins/cache/memory', () => {
    beforeEach(() => {
        mockLru.get.mockClear();
        mockLru.set.mockClear();
        mockLru.has.mockClear();
        mockLru.peek.mockClear();
        next.mockClear();
    });

    it('init, no cache value', () => {
        mockLru.has.mockImplementation(() => false);
        plugin.init(context, next, null);

        expect(getCacheKey).toHaveBeenCalledWith({ url: 'test' });
        expect(mockLru.has).toHaveBeenCalledWith('test');
        expect(mockLru.get).not.toHaveBeenCalled();
        expect(mockLru.peek).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith();
    });

    it('init, value from cache', () => {
        const responseData = { response: {a: 1}, status: 200 };

        mockLru.has.mockImplementation(() => true);
        mockLru.get.mockImplementation(() => responseData);
        plugin.init(context, next, null);

        expect(mockLru.get).toHaveBeenCalledWith('test');
        expect(context.updateExternalMeta).toHaveBeenCalledWith(metaTypes.CACHE, {
            memoryCache: true,
            memoryCacheOutdated: false,
        });
        expect(context.updateInternalMeta).toHaveBeenCalledWith(metaTypes.PROTOCOL_HTTP, {
            response: {
                status: responseData.status
            }
        });
        expect(next).toHaveBeenCalledWith({
            response: responseData.response,
            status: Status.COMPLETE,
        });
    });

    it('init, value from cache outdated, but allowStale is false', () => {
        const plugin = memoryCache({ allowStale: false });
        const responseData = { response: {a: 1}, status: 200 };
        const makeRequest: any = jest.fn(() => Promise.resolve());

        mockLru.has.mockImplementation(() => false);
        mockLru.peek.mockImplementation(() => responseData);
        plugin.init(context, next, makeRequest);

        jest.runAllTimers();

        expect(mockLru.get).not.toHaveBeenCalledWith('test');
        expect(mockLru.peek).not.toHaveBeenCalled();
        expect(makeRequest).not.toHaveBeenCalled();
    });

    it('init, value in cache is outdated and allowStale is true', () => {
        const plugin = memoryCache({ allowStale: true, staleTtl: 523 });
        const responseData = { response: {a: 1}, status: 200 };
        const makeRequest: any = jest.fn(() => Promise.resolve());

        mockLru.has.mockImplementation(() => false);
        mockLru.peek.mockImplementation(() => responseData);
        plugin.init(context, next, makeRequest);

        jest.runAllTimers();

        expect(mockLru.get).not.toHaveBeenCalledWith('test');
        expect(mockLru.set).toHaveBeenCalledWith('test', responseData, { ttl: 523 });
        expect(makeRequest).toHaveBeenCalledWith({ url: 'test', memoryCacheForce: true, memoryCacheBackground: true });
        expect(context.updateExternalMeta).toHaveBeenCalledWith(metaTypes.CACHE, {
            memoryCache: true,
            memoryCacheOutdated: true,
        });
        expect(next).toHaveBeenCalledWith({
            response: responseData.response,
            status: Status.COMPLETE,
        });
    });

    it('init, value in cache is outdated and request memoryCacheAllowStale is true', () => {
        const plugin = memoryCache({ allowStale: false });
        const responseData = { response: {a: 1}, status: 200 };
        const makeRequest: any = jest.fn(() => Promise.resolve());

        context.setState({ request: { url: 'test', memoryCacheAllowStale: true } });
        mockLru.has.mockImplementation(() => false);
        mockLru.peek.mockImplementation(() => responseData);
        plugin.init(context, next, makeRequest);

        jest.runAllTimers();

        expect(mockLru.get).not.toHaveBeenCalledWith('test');
        expect(makeRequest).toHaveBeenCalledWith({
            url: 'test',
            memoryCacheAllowStale: true,
            memoryCacheForce: true,
            memoryCacheBackground: true,
        });
        expect(context.updateExternalMeta).toHaveBeenCalledWith(metaTypes.CACHE, {
            memoryCache: true,
            memoryCacheOutdated: true,
        });
        expect(next).toHaveBeenCalledWith({
            response: responseData.response,
            status: Status.COMPLETE,
        });
    });

    it('on complete saves to cache', () => {
        const responseData = { response: {a: 1}, status: 200 };

        context.setState({ response: responseData.response, request: { url: 'test', memoryCacheTtl: 123 } });
        plugin.complete(context, next, null);

        expect(next).toHaveBeenCalled();
        expect(mockLru.set).toHaveBeenCalledWith('test', responseData, { ttl: 123 });
    });
});
