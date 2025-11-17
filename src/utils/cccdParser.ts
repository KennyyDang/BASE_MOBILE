export interface ParsedParent {
	fullName?: string;
	email?: string;
	phoneNumber?: string;
	cccdNumber?: string;
	dateOfBirth?: string; // dd/MM/yyyy
	address?: string;
}

const normalize = (s: string) => (s || '').replace(/\r/g, '').trim();

export function parseCccdTextToParent(text: string): ParsedParent {
	const content = normalize(text).split('\n').map((l) => l.trim()).filter(Boolean);
	const joined = content.join(' ');

	// Số CCCD: 12 chữ số
	const cccdMatch = joined.match(/\b(\d{12})\b/);
	const cccdNumber = cccdMatch ? cccdMatch[1] : undefined;

	// Họ và tên: dòng có 'Họ và tên' hoặc 'Ho va ten'
	let fullName: string | undefined;
	const nameLine = content.find((l) => /Họ\s*và\s*tên|Ho\s*va\s*ten/i.test(l));
	if (nameLine) {
		fullName = nameLine
			.replace(/Họ\s*và\s*tên\s*:?/i, '')
			.replace(/Ho\s*va\s*ten\s*:?/i, '')
			.trim();
		if (!fullName || fullName.length < 3) {
			// fallback: dòng kế tiếp (nhiều mẫu CCCD tách tên ở dòng sau)
			const idx = content.indexOf(nameLine);
			if (idx >= 0 && idx + 1 < content.length) {
				fullName = content[idx + 1];
			}
		}
	}

	// Ngày sinh dd/MM/yyyy hoặc dd-MM-yyyy
	const dobRaw = joined.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/);
	const dateOfBirth = dobRaw ? dobRaw[1].replace(/-/g, '/') : undefined;

	// Địa chỉ: dòng có 'Quê quán' hoặc 'Nơi thường trú'
	let address: string | undefined;
	const addrLine =
		content.find((l) => /Quê\s*quán|Que\s*quan/i.test(l)) ||
		content.find((l) => /Nơi\s*thường\s*trú|Noi\s*thuong\s*tru/i.test(l));
	if (addrLine) {
		address = addrLine
			.replace(/Quê\s*quán\s*:?/i, '')
			.replace(/Que\s*quan\s*:?/i, '')
			.replace(/Nơi\s*thường\s*trú\s*:?/i, '')
			.replace(/Noi\s*thuong\s*tru\s*:?/i, '')
			.trim();
	}

	return {
		fullName,
		cccdNumber,
		dateOfBirth,
		address,
	};
}


