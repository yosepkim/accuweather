import { point } from "@turf/helpers";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { bboxPolygon } from "@turf/bbox-polygon";

export class Service {

    constructor(httpRequest, TextDecoderStream) {
        this.httpRequest = httpRequest;
        this.textDecoderStream = TextDecoderStream;
    }

    splitPairToCoordinate(pair) {
        const tuple = pair.split(',');
        const coordinate = [
            parseFloat(tuple[0]),
            parseFloat(tuple[1])
        ]
        return coordinate;
    }

    async process(upperLeftPair, lowerRightPair) {
        try {
            const upperLeftCoord = this.splitPairToCoordinate(upperLeftPair);
            const lowerRightCoord = this.splitPairToCoordinate(lowerRightPair);

            const boundingBox = [ upperLeftCoord[0], lowerRightCoord[1], lowerRightCoord[0], upperLeftCoord[1] ];
            const polygon = bboxPolygon(boundingBox);

            const lightingDataUrl = '/api/lightning/glm/15min/';
            const lightingDataResponse =  await this.httpRequest(lightingDataUrl);

            if (lightingDataResponse.ok) {
                let lightingDataSet = {
                    type: "FeatureCollection",
                    features: []
                };

                const reader = lightingDataResponse.body.pipeThrough(new this.textDecoderStream()).getReader();
                let fullDataSet = '';
                while (true) {
                    
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    fullDataSet += value;
                }
                const lightingDataPayload = JSON.parse(fullDataSet);
                for(let i = 0; i < lightingDataPayload['features'].length; i++) {
                    const lightingFeature = lightingDataPayload['features'][i];
                    const originalCoordinate = lightingFeature.geometry.coordinates;
    
                    const currentPoint = point(originalCoordinate)

                    if (booleanPointInPolygon(currentPoint, polygon)) {                   
                        lightingDataSet.features.push(lightingFeature);
                    }
                };
                return {
                    isSuccessfullyProcessed: true,
                    payload: lightingDataSet
                }
                
            } else {
                return {
                    isSuccessfullyProcessed: false,
                    payload: { "exception": `lightingDataAPI call failed: ${lightingDataResponse.status}` }
                }
            }
        } catch(exception) {
            console.log(exception)
            return {
                
                isSuccessfullyProcessed: false,
                payload: { "exception": `Service.process failed: ${exception.toString()}` }
            }
        }   
    }
}

export default Service;