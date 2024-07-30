import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import { EdgeKV } from './edgekv.js';
import URLSearchParams from 'url-search-params';

function buildResponse(httpCode, returnData) {
    return createResponse(
        httpCode, {
            'Content-Type': ['application/json']
        },
        JSON.stringify(returnData)
    );
}

function objectEmptyOrNull(obj) {
    return obj == null || Object.keys(obj).length === 0;
}

function getLocationKey(url) {
    const pattern = /currentconditions\/v1\/(.+)\.json/;
    const matched = pattern.exec(url);
    return matched[1];
}

async function forwardToOrigin(request) {
    return httpRequest(`${request.scheme}://${request.host}${request.url}`);
}

export async function responseProvider(request) {
    try {
        const params = new URLSearchParams(request.query);
        const getphotos = params.get('getphotos');

        if (getphotos === "true") {
            return forwardToOrigin(request);
        }
        const apiKey = params.get('apikey');
        const language = params.get('language');
        const details = params.get('details');
        const callback = params.get('callback');
        const locationKey = getLocationKey(request.url);

        const weatherDB = new EdgeKV({namespace: "weather-data", group: "0"});

        let stationCodeEntry = await weatherDB.getJson({ item: locationKey });
        let xLocationKey;
        let gmtOffset;
        let locationStem;
        let stationCode;

        if (objectEmptyOrNull(stationCodeEntry)) {
            if (apiKey && locationKey) {
                const stationCodeUrl = `/locations/v1/${locationKey}.json?apikey=${apiKey}`;
                const stationCodeResponse =  await httpRequest(stationCodeUrl);
    
                if (stationCodeResponse.ok) {
                    xLocationKey = stationCodeResponse.getHeader('X-Location-Key')[0];
                    gmtOffset = stationCodeResponse.getHeader('X-Gmt-Offset')[0];
                    locationStem = stationCodeResponse.getHeader('X-Location-Stem')[0];
                    stationCode = stationCodeResponse.getHeader('X-Station-Code')[0];

                    weatherDB.putJsonNoWait({ item: locationKey, value: {
                        xLocationKey, gmtOffset, locationStem, stationCode
                    } });
                } else {
                    return buildResponse(500, { "exception": `stationCodeAPI call failed for location ${locationKey} with HTTP status: ${stationCodeResponse.status}` });
                }
            } else {
                return buildResponse(500, { "exception": 'Either APIkey or locationKey is missing.' });
            }
        } else {
            xLocationKey = stationCodeEntry.xLocationKey;
            gmtOffset = stationCodeEntry.gmtOffset;
            locationStem = stationCodeEntry.locationStem;
            stationCode = stationCodeEntry.stationCode;
        }
        

        const cacheKey = `${stationCode}-${gmtOffset}-${details}-${language}`;
        const currentCondtionEntry = await weatherDB.getJson({ item: cacheKey });
        if (objectEmptyOrNull(currentCondtionEntry)) {
            let currentConditionApiUrl = `/currentconditions/v1/stations/${stationCode}?apikey=${apiKey}`;
            if (!objectEmptyOrNull(gmtOffset))
                currentConditionApiUrl = currentConditionApiUrl + `&locationOffset=${gmtOffset}`;
            if (!objectEmptyOrNull(details))
                currentConditionApiUrl = currentConditionApiUrl + `&details=${details}`;
            if (!objectEmptyOrNull(language))
                currentConditionApiUrl = currentConditionApiUrl + `&language=${language}`;
            if (!objectEmptyOrNull(callback))
                currentConditionApiUrl = currentConditionApiUrl + `&callback=${callback}`;
            
            const currentConditionResponse =  await httpRequest(currentConditionApiUrl);
            if (currentConditionResponse.ok) {
                const currentConditionJsonPayload = await currentConditionResponse.json();
                let currentCondition = currentConditionJsonPayload[0];
                const originalMobileLink = currentCondition['MobileLink'];
                currentCondition['MobileLink'] = originalMobileLink.replace('{location}', locationStem).replace('{locationkey}', xLocationKey);         
                const originalLink = currentCondition['Link'];
                currentCondition['Link'] = originalLink.replace('{location}', locationStem).replace('{locationkey}', xLocationKey);; 

                const returnPayload = [ currentCondition ];

                weatherDB.putJsonNoWait({ item: cacheKey, value: returnPayload });

                return buildResponse(200, returnPayload);
            } else {
                return buildResponse(500, { "exception": `currentConditionAPI call failed for station code ${stationCode} with HTTP status: ${currentConditionResponse.status}` });
            }
        } else {
            return buildResponse(200, currentCondtionEntry);
        }
    } catch(exception) {
        return buildResponse(500, { "exception": exception.toString() });
    }
}