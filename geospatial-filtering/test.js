import { isInBoundingBox } from './main.js';

let upperLeft;
let lowerRight;

beforeEach(() => {
	upperLeft = {
        lat: -100.00,
        lon: 100.00 
    }; 
    lowerRight = {
        lat: -90.00,
        lon: 110.00 
    };
});

test('extract the email address from a blob of text', () => {
    const point = {
        lat: -105.00,
        lon: 105.00 
    };

	const result = isInBoundingBox(upperLeft, lowerRight, point)
	expect(result).toBe(true);
});