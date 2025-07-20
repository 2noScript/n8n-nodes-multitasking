export function toUtcIfNoTimezone(schedule_time: string): number {
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(schedule_time);
    const isoString = hasTimezone ? schedule_time : schedule_time + "Z";
    return new Date(isoString).getTime(); // milliseconds
}


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



