import type { Plugin, Request } from '@tinkoff/request-core';

interface Transform {
    (params: Request & { baseUrl: string }): string;
}

interface Params {
    baseUrl?: string;
    transform?: Transform;
}

declare module '@tinkoff/request-core/lib/types.h' {
    export interface Request {
        baseUrl?: string;
    }
}

/**
 * Transforms request url using passed function.
 *
 * @param baseUrl {string}
 * @param transform {Function}
 */
export default ({ baseUrl = '', transform = ({ baseUrl, url }) => `${baseUrl}${url}` }: Params = {}): Plugin => {
    return {
        init: (context, next) => {
            const request = context.getRequest();

            next({
                request: {
                    ...request,
                    url: transform({ ...request, baseUrl: request.baseUrl || baseUrl }),
                },
            });
        },
    };
};
