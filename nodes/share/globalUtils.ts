import { BINARY_ENCODING, IBinaryData, IExecuteFunctions } from 'n8n-workflow';
import { UPLOAD_CHUNK_SIZE } from './globalConstant';
import { Readable } from 'stream';

export function toUtcIfNoTimezone(schedule_time: string): number {
	const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(schedule_time);
	const isoString = hasTimezone ? schedule_time : schedule_time + 'Z';
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

export async function extractBinaryData(exc: IExecuteFunctions, binaryData: IBinaryData) {
	let mimeType: string;
	let contentLength: number;
	let fileContent: Readable;

	if (binaryData.id) {
		// Stream data in 256KB chunks, and upload the via the resumable upload api
		fileContent = await exc.helpers.getBinaryStream(binaryData.id, UPLOAD_CHUNK_SIZE);
		const metadata = await exc.helpers.getBinaryMetadata(binaryData.id);
		contentLength = metadata.fileSize;
		mimeType = metadata.mimeType ?? binaryData.mimeType;
	} else {
		const buffer = Buffer.from(binaryData.data, BINARY_ENCODING);
		fileContent = Readable.from(buffer);
		contentLength = buffer.length;
		mimeType = binaryData.mimeType;
	}
	return {
		mimeType,
		contentLength,
		fileContent,
	};
}


