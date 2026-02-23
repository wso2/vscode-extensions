export type HurlRunnerErrorCategory =
	| 'environment_error'
	| 'discovery_error'
	| 'execution_error'
	| 'parse_error';

export class HurlRunnerError extends Error {
	readonly category: HurlRunnerErrorCategory;
	readonly details?: Record<string, unknown>;

	constructor(category: HurlRunnerErrorCategory, message: string, details?: Record<string, unknown>) {
		super(message);
		this.category = category;
		this.details = details;
	}
}
