import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import URLSearchParams from 'url-search-params';
import { TextDecoderStream } from 'text-encode-transform';
import Service from './service.js';

function buildResponse(httpCode, returnData) {
    return createResponse(
        httpCode, {
            'Content-Type': ['application/json']
        },
        JSON.stringify(returnData)
    );
}

export async function responseProvider(request) {
    try {
        const params = new URLSearchParams(request.query);
        const upperLeft = params.get('upperLeft');
        const lowerRight = params.get('lowerRight');

        const service = new Service(httpRequest, TextDecoderStream);

        const result = await service.process(upperLeft, lowerRight);
        if (result.isSuccessfullyProcessed) 
            return buildResponse(200, result.payload);
        else 
            return buildResponse(501, result.payload);
    } catch(exception) {
        return buildResponse(502, { "exception": exception.toString() });
    }
}