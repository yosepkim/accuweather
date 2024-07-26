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

export function isInBoundingBox(upperLeft, lowerRight, point) {
    const isLongInRange = point.lon <= upperLeft.lon && point.lon >= lowerRight.lon;
    const isLatiInRange = point.lat <= upperLeft.lat && point.lat >= lowerRight.lat;
    return (isLongInRange && isLatiInRange);
}

export async function responseProvider(request) {
    try {
        const params = new URLSearchParams(request.query);
        const upperLeft = params.get('upperLeft');
        const lowerRight = params.get('lowerRight');
       
        const upperLeftTuple = upperLeft.split(',');
        const upperLeftCoord = {
            lat: parseFloat(upperLeftTuple[0]),
            lon: parseFloat(upperLeftTuple[1])
        }
        
        const lowerRightTuple = lowerRight.split(',');
        const lowerRightCoord = {
            lat: parseFloat(lowerRightTuple[0]),
            lon: parseFloat(lowerRightTuple[1])
        }

        const lightingDataUrl = '/api/lightning/glm/15min/';
        const lightingDataResponse =  await httpRequest(lightingDataUrl);
    
        if (lightingDataResponse.ok) {
            const lightingDataPayload = await lightingDataResponse.json();
            
            for(let i = 0; i < lightingDataPayload['features'].length; i++) {
                const lightingFeature = lightingDataPayload['features'][i];
                const originalCoordinate = lightingFeature.geometry.coordinates;
                const pointCoordinate = { 
                    lat: parseFloat(originalCoordinate[0]),
                    lon: parseFloat(originalCoordinate[1])
                }
                if (!isInBoundingBox(upperLeftCoord, lowerRightCoord, pointCoordinate)) {
                    lightingDataPayload['features'].splice(i, 1);
                }
            };
            return buildResponse(200, lightingDataPayload);
            
        } else {
            return buildResponse(500, { "exception": `lightingDataAPI call failed: ${lightingDataResponse.status}` });
        }
    } catch(exception) {
        return buildResponse(500, { "exception": exception.toString() });
    }
}