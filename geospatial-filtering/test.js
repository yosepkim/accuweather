import { Service } from './service.js';

let service;

beforeEach(() => {
    const mockHttpRequest = () => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                'features': [{
                        'geometry': {
                            'coordinates': [-95.55, 68.99]
                        }
                    }, {
                        'geometry': {
                            'coordinates': [-95.55, 85.12]
                        }
                    }, {
                        'geometry': {
                            'coordinates': [-102.55, 85.12]
                        }
                    }
                ]}
            )}
        )}
	service = new Service(mockHttpRequest);
});

test('processes a request', async () => {
	const result = await service.process("-100.00,100.00", "-90.00,70.00");
	expect(result.payload.features.length).toBe(1);
});

test('checks if a point is in a bounding box', () => {
    const point = {
        lat: -95.00,
        lon: 85.00 
    };

    const upperLeft = {
        lat: -100.00,
        lon: 100.00 
    }; 
    const lowerRight = {
        lat: -90.00,
        lon: 70.00 
    };

	const result = service.isInBoundingBox(upperLeft, lowerRight, point)
	expect(result).toBe(true);
});