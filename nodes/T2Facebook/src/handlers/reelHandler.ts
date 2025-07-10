import {
	BINARY_ENCODING,
	IBinaryData,
	IExecuteFunctions,
	IRequestOptions,
	sleep,
} from 'n8n-workflow';
//@ts-ignore
import { Readable } from 'stream';
import { allowUnauthorizedCerts, API_VERSION, hostUrl, UPLOAD_CHUNK_SIZE } from '../settings';
import { Buffer } from 'buffer';


export type Publish = "PUBLISHED"|"DRAFT"

class ReelHandler {
	baseUri: string;

	constructor() {
		this.baseUri = `https://${hostUrl}/${API_VERSION}`;
	}

	async uploadReel(
		exc: IExecuteFunctions,
		title: string,
		description: string,
		binaryData: IBinaryData,
        publish:Publish
	) {
		const { video_id, upload_url } = await this.startUpload(exc);
		const { uploadVideoStatus, responseUpload } = await this.uploadVideo(
			exc,
			upload_url,
			video_id,
			binaryData,
		);
		if (uploadVideoStatus !== 'complete') {
			throw new Error(`Upload video failed: ${JSON.stringify(responseUpload)}`);
		}
		const publishRes= await  this.publishReel(exc, video_id, title, description,publish);
        return{
            publishRes,
            video_id
        }
	}

	private async extractBinaryData(exc: IExecuteFunctions, binaryData: IBinaryData) {
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

	private async startUpload(exc: IExecuteFunctions) {
		const graphApiCredentials = await exc.getCredentials('facebookGraphApi');
		const sessionUploadRequestOption: IRequestOptions = {
			headers: {
				accept: 'application/json,text/*;q=0.99',
			},
			method: 'POST',
			json: true,
			gzip: true,
			uri: `${this.baseUri}/me/video_reels`,
			rejectUnauthorized: !allowUnauthorizedCerts,
			qs: {
				access_token: graphApiCredentials.accessToken,
				upload_phase: 'start',
			},
		};
		return exc.helpers.request(sessionUploadRequestOption);
	}

	private async uploadVideo(
		exc: IExecuteFunctions,
		upload_url: string,
		video_id: string,
		binaryData: IBinaryData,
	) {
		const graphApiCredentials = await exc.getCredentials('facebookGraphApi');
		const { contentLength, fileContent } = await this.extractBinaryData(exc, binaryData);
		const uploadDataRequestOption: IRequestOptions = {
			headers: {
				Authorization: `OAuth ${graphApiCredentials.accessToken}`,
				offset: '0',
				file_size: contentLength,
				'Content-Length': contentLength.toString(),
			},
			uri: upload_url,
			method: 'POST',
			body: fileContent,
			json: true,
		};

		const responseUploadData = await exc.helpers.request(uploadDataRequestOption);
		let uploadVideoStatus = 'failed';
		let responseUpload = null;

		if (responseUploadData.success) {
			const maxAttempts = 30;
			const delayMs = 2000;
			let attempt = 0;
			while (attempt < maxAttempts) {
				const statusResponse = await exc.helpers.request({
					method: 'GET',
					uri: `${this.baseUri}/${video_id}`,
					qs: {
						fields: 'status',
						access_token: graphApiCredentials.accessToken,
					},
					json: true,
				});
				responseUpload = statusResponse;

				const uploadStatus = statusResponse?.status?.uploading_phase?.status;

				if (uploadStatus === 'complete') {
					uploadVideoStatus = 'complete';
					break;
				}
				await sleep(delayMs);
				attempt++;
			}
		}
		return {
			uploadVideoStatus,
			responseUpload,
		};
	}

	private async publishReel(
		exc: IExecuteFunctions,
		video_id: string,
		title: string,
		description: string,
        publish:Publish
	) {
		const graphApiCredentials = await exc.getCredentials('facebookGraphApi');
		const publishReelRequestOption: IRequestOptions = {
			method: 'POST',
			uri: `${this.baseUri}/me/video_reels`,
			qs: {
				access_token: graphApiCredentials.accessToken,
				video_id: video_id,
				upload_phase: 'finish',
				video_state: publish,
				title: title,
				description: description,
			},
		};
		const response = await exc.helpers.request(publishReelRequestOption);
		return response;
	}
}

export const reelHandler=new ReelHandler()

