function escapeRegexChar(value: string): string {
	return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function wildcardToRegex(pattern: string): RegExp {
	let expression = '';

	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];
		const next = pattern[i + 1];

		if (char === '*' && next === '*') {
			expression += '.*';
			i += 1;
			continue;
		}

		if (char === '*') {
			expression += '[^/]*';
			continue;
		}

		expression += escapeRegexChar(char);
	}

	return new RegExp(`^${expression}$`);
}

export function normalizeForPattern(pathValue: string): string {
	return pathValue.replace(/\\/g, '/');
}

export function matchesPattern(pathValue: string, pattern: string): boolean {
	const normalizedPath = normalizeForPattern(pathValue);
	const normalizedPattern = normalizeForPattern(pattern);
	const regex = wildcardToRegex(normalizedPattern);
	return regex.test(normalizedPath);
}
