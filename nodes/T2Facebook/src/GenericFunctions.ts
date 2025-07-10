export function captureError(error: any) {
	let errorItem;
	if (error.response !== undefined) {
		const graphApiErrors = error.response.body?.error ?? {};

		errorItem = {
			statusCode: error.statusCode,
			...graphApiErrors,
			headers: error.response.headers,
		};
	} else {
		errorItem = error;
	}
	return errorItem;
}



