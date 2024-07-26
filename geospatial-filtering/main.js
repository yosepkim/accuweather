import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import URLSearchParams from 'url-search-params';
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

        const service = new Service(httpRequest);

        const result = service.process(upperLeft, lowerRight);
        if (result.isSuccessfullyProcessed) 
            return buildResponse(200, result.paylod);
        else 
            return buildResponse(500, result.payload);
    } catch(exception) {
        return buildResponse(500, { "exception": exception.toString() });
    }
}