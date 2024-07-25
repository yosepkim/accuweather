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

function replaceLocationStemAndKey(text, regexPattern, locationStem, xLocationKey) {
    const mobileLinkMatches = regexPattern.exec(text);
    return originalMobileLink
        .replace(mobileLinkMatches[2], locationStem)
        .replace(mobileLinkMatches[3], xLocationKey);  
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

        const database = new EdgeKV({namespace: "stationcode", group: "0"});

        let stationCodeEntry = await database.getJson({ item: locationKey });
        if (objectEmptyOrNull(stationCodeEntry)) {
            if (apiKey && locationKey) {
                const stationCodeUrl = `https://api.accuweather.com/locations/v1/${locationKey}.json?apikey=${apiKey}`;
                const stationCodeResponse =  await httpRequest(stationCodeUrl, { method: 'HEAD' });
    
                if (stationCodeResponse.ok) {
                    const xLocationKey = stationCodeResponse.getHeader('X-Location-Key');
                    const gmtOffset = stationCodeResponse.getHeader('X-Gmt-Offset');
                    const locationStem = stationCodeResponse.getHeader('X-Location-Stem');
                    const stationCode = stationCodeResponse.getHeader('X-Station-Code');
    
                    let currentConditionApiUrl = `https://api.accuweather.com/currentconditions/v1/stations/${stationCode}?apikey=${apikey}`
                    currentConditionApiUrl = currentConditionApiUrl + `&locationOffset=${gmtOffset}`;
                    currentConditionApiUrl = currentConditionApiUrl + `&details=${details}`;
                    currentConditionApiUrl = currentConditionApiUrl + `&language=${language}`;
                    currentConditionApiUrl = currentConditionApiUrl + `&callback=${callback}`;
                    
                    const currentConditionResponse =  await httpRequest(currentConditionApiUrl);
                    if (currentConditionResponse.ok) {
                        let currentConditionJsonPayload = await currentConditionResponse.json();
                        const originalMobileLink = currentConditionJsonPayload['MobileLink'];
                        currentConditionJsonPayload['MobileLink'] = replaceLocationStemAndKey(originalMobileLink, /m\.accuweather\.com\/es\/(.+)\/currentweather\/(.+)\//, locationStem, xLocationKey);         
                        const originalLink = currentConditionJsonPayload['Link'];
                        currentConditionJsonPayload['Link'] = replaceLocationStemAndKey(originalLink, /www\.accuweather\.com\/es\/(.+)\/currentweather\/(.+)\//, locationStem, xLocationKey); 

                        return buildResponse(200, currentConditionJsonPayload);
                    } else {
                        return buildResponse(500, { "exception": 'currentConditionAPI call failed' });
                    }
                } else {
                    return buildResponse(500, { "exception": 'stationCodeAPI call failed' });
                }
            } else {
                return buildResponse(500, { "exception": 'Either APIkey or locationKey is missing.' });
            }
        }        
    } catch(exception) {
        return buildResponse(500, { "exception": exception.toString() });
    }
}