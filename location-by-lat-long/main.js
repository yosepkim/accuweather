import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import URLSearchParams from 'url-search-params';

function buildResponse(httpCode, returnData) {
    return createResponse(
        httpCode, {
            'Content-Type': ['application/json']
        },
        JSON.stringify(returnData)
    );
}

async function forwardToOrigin(request) {
    return httpRequest(`${request.scheme}://${request.host}${request.url}`);
}

function isValidLatLong(lat, long) {
    const isLatValid = (lat >= -90 && lat <= 90);
    const isLongValid = (long >= -190 && long <= 180);
    return (isLatValid && isLongValid);
}
export async function responseProvider(request) {
    try {
        const params = new URLSearchParams(request.query);
        const query = params.get('q');
        const coordinate = query.split(',');
        const lat = parseFloat(coordinate[0]);
        const long = parseFloat(coordinate[1]);

        if (isValidLatLong(lat, long)) {
            return forwardToOrigin(request);
        } else {
            return buildResponse(400, {
                "Code": "400",
                "Message": "Parameter q must be in the format {latitude},{longitude}. Valid values are: latitude -90.0 to 90.0, longitude -180 to 180 example: ?q=40.8,-77.8",
                "Reference": ""
            });
        }
    } catch(exception) {
        return buildResponse(500, { "exception": exception.toString() });
    }
}