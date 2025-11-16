import { GOOGLE_VISION_API_KEY } from '@env';

const visionService = {
	textDetectionBase64: async (base64: string): Promise<string> => {
		if (!GOOGLE_VISION_API_KEY) {
			throw new Error('Thiếu GOOGLE_VISION_API_KEY trong .env');
		}
		const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
		const body = {
			requests: [
				{
					image: { content: base64 },
					features: [{ type: 'TEXT_DETECTION' }],
				},
			],
		};
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			const t = await res.text();
			throw new Error(t || 'OCR API lỗi');
		}
		const data = await res.json();
		const text =
			data?.responses?.[0]?.fullTextAnnotation?.text ||
			data?.responses?.[0]?.textAnnotations?.[0]?.description ||
			'';
		return text;
	},
};

export default visionService;


