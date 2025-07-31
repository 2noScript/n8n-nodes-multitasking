import { IBinaryData, IExecuteFunctions } from 'n8n-workflow';
import aws4 from 'aws4';
import { crc32 } from 'zlib';
import crypto from 'crypto';
import qs from 'qs';
import { get_x_bogus } from '../algorithm/x_bogus';
import { extractBinaryData } from '../../../share/globalUtils';

class VideoHandler {
	UA =
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36';
	MIN_MARGIN_SCHEDULE_TIME = 900; // 15 minutes
	MAX_MARGIN_SCHEDULE_TIME = 864000; // 10 days
	MARGIN_TO_UPLOAD_VIDEO = 300; // 5 minutes

	private headers!: Record<string, any>;

	private async getHeader(exc: IExecuteFunctions) {
		if (!this.headers) {
			const tiktokApi = await exc.getCredentials('tiktokApi');
			this.headers = {
				'User-Agent': this.UA,
				'X-Secsdk-Csrf-Request': '1',
				'X-Secsdk-Csrf-Version': '1.2.8',
				Cookie: tiktokApi.cookie,
			};
		}
		return this.headers;
	}

	private getCreationId() {
		const length = 21;
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let creationid = '';
		for (let i = 0; i < length; i++) {
			creationid += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		return creationid;
	}

	async uploadVideo(
		exc: IExecuteFunctions,
		description: string,
		binaryData: IBinaryData,
		schedule_time?: number,
	) {
		const headers = await this.getHeader(exc);

		const { creationID, project_id } = await this.initOneUpload(exc);
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

	private async initOneUpload(exc: IExecuteFunctions) {
		const url_creation = `https://www.tiktok.com/api/v1/web/project/create/?creation_id=${this.getCreationId()}&type=1&aid=1988`;
		const res_url_creation = await exc.helpers.request({
			method: 'POST',
			url: url_creation,
			headers: await this.getHeader(exc),
			json: true,
		});
		const { creationID, project_id } = res_url_creation.project;
		return {
			creationID,
			project_id,
		};
	}

	private async authUpload(exc: IExecuteFunctions) {
		const authResponse = await exc.helpers.request({
			method: 'GET',
			headers: await this.getHeader(exc),
			url: 'https://www.tiktok.com/api/v1/video/upload/auth/',
			json: true,
		});
		const {
			access_key_id: accessKeyId,
			secret_acess_key: secretAccessKey,
			session_token: sessionToken,
		} = authResponse.video_token_v5;
		return {
			accessKeyId,
			secretAccessKey,
			sessionToken,
		};
	}

	private async signedUploadInfo(
		exc: IExecuteFunctions,
		accessKeyId: string,
		secretAccessKey: string,
		sessionToken: string,
		fileSize: string,
	) {
		const queryParams = new URLSearchParams({
			Action: 'ApplyUploadInner',
			Version: '2020-11-19',
			SpaceName: 'tiktok',
			FileType: 'video',
			IsInner: '1',
			FileSize: fileSize,
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
		const { Vid: videoId, SessionKey: sessionKey } = uploadNode;
		const { StoreUri: storeUri, Auth: videoAuth } = uploadNode.StoreInfos[0];
		const uploadHost = uploadNode.UploadHost;
		return {
			videoId,
			sessionKey,
			storeUri,
			uploadHost,
			videoAuth,
		};
	}

	private async startUpload(
		exc: IExecuteFunctions,
		uploadHost: string,
		storeUri: string,
		videoAuth: Record<string, any>,
	) {
		const rand = Array.from({ length: 30 }, () => Math.floor(Math.random() * 10).toString()).join(
			'',
		);
		const uploadInitUrl = `https://${uploadHost}/${storeUri}?uploads`;
		const repsStartUpload = await exc.helpers.request({
			method: 'POST',
			url: uploadInitUrl,
			headers: {
				...(await this.getHeader(exc)),
				Authorization: videoAuth,
				'Content-Type': `multipart/form-data; boundary=---------------------------${rand}`,
			},
			body: `-----------------------------${rand}--`,
			json: true,
		});
		return repsStartUpload.uploadID;
	}

	private async uploadDataChunk(
		exc: IExecuteFunctions,
		fileContent: any,
		uploadHost: string,
		storeUri: string,
		videoAuth: string,
		uploadID: string,
	) {
		const crcs: any[] = [];
		let offset = 0;

		for await (const chunk of fileContent) {
			const crc = crc32(chunk).toString(16).padStart(8, '0');
			offset += 1;
			crcs.push(crc);
			const partUrl = `https://${uploadHost}/${storeUri}?partNumber=${offset}&uploadID=${uploadID}`;
			await exc.helpers.request({
				method: 'POST',
				url: partUrl,
				headers: {
					...(await this.getHeader(exc)),
					Authorization: videoAuth,
					'Content-Type': 'application/octet-stream',
					'Content-Disposition': 'attachment; filename="undefined"',
					'Content-Crc32': crc,
				},
				body: chunk,
			});
		}
		return crcs;
	}

	private async completeUpload(
		exc: IExecuteFunctions,
		uploadHost: string,
		storeUri: string,
		videoAuth: string,
		uploadID: string,
		crcs: any[],
	) {
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
	}

	private async commitUpload(
		exc: IExecuteFunctions,
		sessionKey: string,
		accessKeyId: string,
		secretAccessKey: string,
		sessionToken: string,
	) {
		const commitUrl = 'https://vod-ap-singapore-1.bytevcloudapi.com/';
		const commitParams = 'Action=CommitUploadInner&SpaceName=tiktok&Version=2020-11-19';
		const now = new Date();
		const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
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
		const commitResponse = await exc.helpers.request({
			method: 'POST',
			url: `${commitUrl}?${commitParams}`,
			headers: {
				...(await this.getHeader(exc)),
				...signedCommit.headers,
			},
			body,
			json: true,
		});
		return commitResponse;
	}

	async loadVideo(exc: IExecuteFunctions, binaryData: IBinaryData) {
		const { contentLength, fileContent } = await extractBinaryData(exc, binaryData);

		const { accessKeyId, secretAccessKey, sessionToken } = await this.authUpload(exc);

		const { videoId, sessionKey, storeUri, uploadHost, videoAuth } = await this.signedUploadInfo(
			exc,
			accessKeyId,
			secretAccessKey,
			sessionToken,
			contentLength?.toString(),
		);

		// Step 3: Start Upload

		const uploadID = await this.startUpload(exc, uploadHost, storeUri, videoAuth);

		// Step 4: Upload Chunks

		const crcs = await this.uploadDataChunk(
			exc,
			fileContent,
			uploadHost,
			storeUri,
			videoAuth,
			uploadID,
		);

		// Step 5: Complete Upload

		await this.completeUpload(exc, uploadHost, storeUri, videoAuth, uploadID, crcs);

		// Step 6: Commit Upload (AWS SigV4)
		const commitResponse = await this.commitUpload(
			exc,
			sessionKey,
			accessKeyId,
			secretAccessKey,
			sessionToken,
		);
		return {
			// signedCommit,
			commitResponse,
			videoId,
		};
	}
}

export const videoHandler = new VideoHandler();
