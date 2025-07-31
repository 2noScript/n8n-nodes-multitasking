import { BINARY_ENCODING, IBinaryData, IExecuteFunctions } from 'n8n-workflow';
import { getCreationId } from '../utils';
import { Readable } from 'stream';
import { UPLOAD_CHUNK_SIZE } from '../../../share/globalConstant';
import aws4 from 'aws4';
import { crc32 } from 'zlib';
import crypto from 'crypto';
import qs from 'qs';
import { get_x_bogus } from '../algorithm/x_bogus';

function _crc32(buffer: any) {
	return crc32(buffer).toString(16).padStart(8, '0');
}

class VideoHandler {
	UA =
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36';
	MIN_MARGIN_SCHEDULE_TIME = 900; // 15 minutes
	MAX_MARGIN_SCHEDULE_TIME = 864000; // 10 days
	MARGIN_TO_UPLOAD_VIDEO = 300; // 5 minutes

	private async getHeader(exc: IExecuteFunctions) {
		const tiktokApi = await exc.getCredentials('tiktokApi');
		return {
			'User-Agent': this.UA,
			'X-Secsdk-Csrf-Request': '1',
			'X-Secsdk-Csrf-Version': '1.2.8',
			Cookie: tiktokApi.cookie,
		};
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

	async uploadVideo(
		exc: IExecuteFunctions,
		title: string,
		tags: string,
		binaryData: IBinaryData,
		url_prefix?: string,
		schedule_time?: number,
	) {
		const headers = await this.getHeader(exc);
		const url_creation = `https://${url_prefix ?? 'www'}.tiktok.com/api/v1/web/project/create/?creation_id=${getCreationId()}&type=1&aid=1988`;

		const res_url_creation = await exc.helpers.request({
			method: 'POST',
			url: url_creation,
			headers,
			json: true,
		});

		const { creationID, project_id } = res_url_creation.project;

		const { videoId, commitResponse } = await this.loadVideo(exc, binaryData);

		const postQuery: Record<string, any> = {
			app_name: 'tiktok_web',
			channel: 'tiktok_web',
			device_platform: 'web',
			aid: 1988,
		};

		let data: Record<string, any> = {
			post_common_info: {
				creation_id: creationID,
				enter_post_page_from: 1,
				post_type: 3,
			},
			feature_common_info_list: [
				{
					geofencing_regions: [],
					playlist_name: '',
					playlist_id: '',
					tcm_params: '{"commerce_toggle_info":{}}',
					sound_exemption: 0,
					anchors: [],
					vedit_common_info: {
						draft: '',
						video_id: videoId,
					},
					privacy_setting_info: {
						visibility_type: 0,
						allow_duet: 1,
						allow_stitch: 1,
						allow_comment: 1,
					},
				},
			],
			single_post_req_list: [
				{
					batch_index: 0,
					video_id: videoId,
					is_long_video: 0,
					single_post_feature_info: {
						// text: title,
						// text_extra: [],
						// markup_text: title,
						music_info: {},
						poster_delay: 0,
						text: 'Generated video 1 #ve',
						text_extra: [
							{
								tag_id: '0',
								start: 18,
								end: 21,
								user_id: '',
								type: 1,
								hashtag_name: 've',
							},
						],
						markup_text: 'Generated video 1 <h id="0">#ve</h>',
					},
				},
			],
		};

		// if (schedule_time ?? 0 > 0) {
		// 	data.upload_param.schedule_time = schedule_time;
		// }
		postQuery['X-Bogus'] = get_x_bogus(qs.stringify(postQuery), JSON.stringify(data), this.UA);

		const test = await exc.helpers.request({
			method: 'POST',
			url: 'https://www.tiktok.com/tiktok/web/project/post/v1/',
			headers: {
				...headers,
				'content-type': 'application/json',
				'user-agent': this.UA,
				origin: 'https://www.tiktok.com',
				referer: 'https://www.tiktok.com/',
				Host: 'www.tiktok.com',
			},
			qs: postQuery,
			body: JSON.stringify(data),
			json: true,
		});

		return {
			// url_prefix,
			// title,
			// tags,
			// schedule_time,
			creationID,
			project_id,
			test,
			postQuery,
			commitResponse,
			params: qs.stringify(postQuery),
		};
	}

	async loadVideo(exc: IExecuteFunctions, binaryData: IBinaryData) {
		const { contentLength, fileContent } = await this.extractBinaryData(exc, binaryData);
		const headers = await this.getHeader(exc);

		const authResponse = await exc.helpers.request({
			method: 'GET',
			headers,
			url: 'https://www.tiktok.com/api/v1/video/upload/auth/',
			json: true,
		});
		const {
			access_key_id: accessKeyId,
			secret_acess_key: secretAccessKey,
			session_token: sessionToken,
		} = authResponse.video_token_v5;

		const queryParams = new URLSearchParams({
			Action: 'ApplyUploadInner',
			Version: '2020-11-19',
			SpaceName: 'tiktok',
			FileType: 'video',
			IsInner: '1',
			FileSize: contentLength?.toString(),
			s: 'g158iqx8434',
		}).toString();

		const signedApplyUpload = aws4.sign(
			{
				host: 'www.tiktok.com',
				path: `/top/v1?${queryParams}`,
				service: 'vod',
				region: 'ap-singapore-1',
				method: 'GET',
			},
			{ accessKeyId, secretAccessKey, sessionToken },
		);

		const applyUploadResponse = await exc.helpers.request({
			method: 'GET',
			url: `https://www.tiktok.com/top/v1?${queryParams}`,
			headers: signedApplyUpload.headers,
			json: true,
		});

		const uploadNode = applyUploadResponse.Result.InnerUploadAddress.UploadNodes[0];
		const {
			Vid: videoId,

			SessionKey: sessionKey,
		} = uploadNode;
		const { StoreUri: storeUri, Auth: videoAuth } = uploadNode.StoreInfos[0];
		const uploadHost = uploadNode.UploadHost;

		// Step 3: Start Upload

		const rand = Array.from({ length: 30 }, () => Math.floor(Math.random() * 10).toString()).join(
			'',
		);
		const uploadInitUrl = `https://${uploadHost}/${storeUri}?uploads`;
		const repsStartUpload = await exc.helpers.request({
			method: 'POST',
			url: uploadInitUrl,
			headers: {
				...headers,
				Authorization: videoAuth,
				'Content-Type': `multipart/form-data; boundary=---------------------------${rand}`,
			},
			body: `-----------------------------${rand}--`,
			json: true,
		});

		const uploadID = repsStartUpload.payload.uploadID;

		// Step 4: Upload Chunks
		const crcs: any[] = [];
		let offset = 0;
		for await (const chunk of fileContent) {
			const crc = _crc32(chunk);
			offset += 1;

			crcs.push(crc);
			const partUrl = `https://${uploadHost}/${storeUri}?partNumber=${offset}&uploadID=${uploadID}`;
			await exc.helpers.request({
				method: 'POST',
				url: partUrl,
				headers: {
					...headers,
					Authorization: videoAuth,
					'Content-Type': 'application/octet-stream',
					'Content-Disposition': 'attachment; filename="undefined"',
					'Content-Crc32': crc,
				},
				body: chunk,
			});
		}

		// Step 5: Complete Upload
		const completeUrl = `https://${uploadHost}/${storeUri}?uploadID=${uploadID}`;
		const completeData = Array.from({ length: crcs.length }, (_, i) => `${i + 1}:${crcs[i]}`).join(
			',',
		);

		await exc.helpers.request({
			method: 'POST',
			url: completeUrl,
			headers: {
				Authorization: videoAuth,
				origin: 'https://www.tiktok.com',
				'Content-Type': 'text/plain;charset=UTF-8',
			},
			body: completeData,
		});

		// Step 6: Commit Upload (AWS SigV4)
		const commitUrl = 'https://vod-ap-singapore-1.bytevcloudapi.com/';
		const commitParams = 'Action=CommitUploadInner&SpaceName=tiktok&Version=2020-11-19';
		const now = new Date();
		const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
		// const datestamp = amzdate.slice(0, 8);
		const body = JSON.stringify({ SessionKey: sessionKey, Functions: [] });

		const sha256Body = crypto.createHash('sha256').update(body).digest('hex');

		const signedCommit = aws4.sign(
			{
				host: 'vod-ap-singapore-1.bytevcloudapi.com',
				method: 'POST',
				path: `/?${commitParams}`,
				service: 'vod',
				region: 'ap-singapore-1',
				headers: {
					'x-amz-content-sha256': sha256Body,
					'x-amz-date': amzdate,
					'x-amz-security-token': sessionToken,
				},
				body,
			},
			{ accessKeyId, secretAccessKey, sessionToken },
		);

		// // signedCommit.headers['Content-Type'] = 'text/plain;charset=UTF-8';

		const commitResponse = await exc.helpers.request({
			method: 'POST',
			url: `${commitUrl}?${commitParams}`,
			headers: {
				...headers,
				...signedCommit.headers,
			},
			body,
			json: true,
		});

		return {
			// signedCommit,
			commitResponse,
			videoId,
		};
	}
}

export const videoHandler = new VideoHandler();
