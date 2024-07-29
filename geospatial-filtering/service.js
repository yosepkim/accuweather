export class Service {

    constructor(httpRequest, TextDecoderStream) {
        this.httpRequest = httpRequest;
        this.textDecoderStream = TextDecoderStream;
    }

    splitPairToCoordinate(pair) {
        const tuple = pair.split(',');
        const coordinate = {
            lat: parseFloat(tuple[0]),
            lon: parseFloat(tuple[1])
        }
        return coordinate;
    }

    isInBoundingBox(upperLeft, lowerRight, point) {
        const isLonInRange = point.lon <= upperLeft.lon && point.lon >= lowerRight.lon;
        const isLatiInRange = point.lat >= upperLeft.lat && point.lat <= lowerRight.lat;
        return (isLonInRange && isLatiInRange);
    }

    async process(upperLeftPair, lowerRightPair) {
        try {
            const upperLeftCoord = this.splitPairToCoordinate(upperLeftPair);
            const lowerRightCoord = this.splitPairToCoordinate(lowerRightPair);
    
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
    
                    const pointCoordinate = { 
                        lat: parseFloat(originalCoordinate[0]),
                        lon: parseFloat(originalCoordinate[1])
                    }
                    if (this.isInBoundingBox(upperLeftCoord, lowerRightCoord, pointCoordinate)) {                   
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
            return {
                isSuccessfullyProcessed: false,
                payload: { "exception": `Service.process failed: ${exception.toString()}` }
            }
        }   
    }
}

export default Service;