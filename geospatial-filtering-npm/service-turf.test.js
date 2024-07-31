import { Service } from './service-turf.js';

let service;

const mockLightingData = [
    ' {"type": "FeatureCollection",',
    ' "features": [{',
    ' "geometry": {',
    ' "coordinates": [-95.55, 68.99]',
    ' }',
    ' }, {',
    ' "geometry": {',
    ' "coordinates": [-95.55, 85.12]',
    ' }',
    ' }, {',
    ' "geometry": {',
    ' "coordinates": [-102.55, 85.12]',
    ' }}]}'
];

beforeEach(() => {
    const mockHttpRequest = () => {
        return Promise.resolve({
            ok: true,
            body: {
                pipeThrough: (_) => {
                    return {
                        getReader: () => {
                            let i = 0;
                            return {
                                read() {
                                  return Promise.resolve(
                                    i < mockLightingData.length
                                      ? { value: mockLightingData[i++], done: false }
                                      : { value: undefined, done: true }
                                  );
                                },
                              };
                        }
                    };
                }
            }
        })
    }
	service = new Service(mockHttpRequest, TextDecoderStream);
});

test('processes a request', async () => {
    let result = await service.process("-94.00,100.00", "-90.00,70.00");
	expect(result.payload.features.length).toBe(0);

	result = await service.process("-100.00,100.00", "-90.00,70.00");
	expect(result.payload.features.length).toBe(1);

    result = await service.process("-100.00,100.00", "-90.00,67.00");
	expect(result.payload.features.length).toBe(2);

    result = await service.process("-104.00,100.00", "-90.00,67.00");
	expect(result.payload.features.length).toBe(3);
});