import { IExecuteFunctions } from 'n8n-workflow';
import aws4 from 'aws4';
import { crc32 } from 'zlib';
import crypto from 'crypto';
import qs from 'qs';
import { get_x_bogus } from '../algorithm/x_bogus';
import {
	extractBinaryData,
	extractHashtag,
	findAllHashtagContentPositions,
} from '../../../share/globalUtils';
import {
	UA,
	X_SECSDK_CSRF_REQUEST,
	X_SECSDK_CSRF_VERSION,
	VIDEO_PARAMS,
	BASE_URL,
	HOST,
} from '../settings';
import { videoException } from '../exception/videoException';

class VideoHandler {
	private headers!: Record<string, any>;

	private async getHeader(exc: IExecuteFunctions) {
		if (!this.headers) {
			const tiktokApi = await exc.getCredentials('tiktokApi');
			this.headers = {
				'User-Agent': UA,
				'X-Secsdk-Csrf-Request': X_SECSDK_CSRF_REQUEST,
				'X-Secsdk-Csrf-Version': X_SECSDK_CSRF_VERSION,
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
				host: HOST,
				path: `/top/v1?${queryParams}`,
				service: 'vod',
				region: 'ap-singapore-1',
				method: 'GET',
			},
			{ accessKeyId, secretAccessKey, sessionToken },
		);
		const applyUploadResponse = await exc.helpers.request({
			method: 'GET',
			url: `${BASE_URL}/top/v1?${queryParams}`,
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
		return repsStartUpload.payload.uploadID;
	}

	private async uploadDataChunk(
		exc: IExecuteFunctions,
		fileContent: any,
		uploadHost: string,
		storeUri: string,
		videoAuth: Record<string, any>,
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
		videoAuth: Record<string, any>,
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
				'Content-Type': 'text/plain;charset=UTF-8',
				origin: BASE_URL,
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

	private async getTagsExtra(exc: IExecuteFunctions, description: string) {
		const rawHashtags = extractHashtag(description);
		const checkHashtagUrl = 'https://www.tiktok.com/api/upload/challenge/sug/';
		let newDescription = description;
		let textExtra = [];
		let markupText = description;
		let errorr_list:any[]=[]
		let index=0;
		const hashtags: string[] = [];

		const requests = rawHashtags.map((hashtag) =>
			exc.helpers.request({
				method: 'GET',
				url: `${checkHashtagUrl}`,
				qs: {
					keyword: hashtag,
				},
				json: true,
			}),
		);

		const results = await Promise.all(requests);

		rawHashtags.forEach((hashtag, index) => {
			const result = results[index];
			let verified = hashtag;
			const hashtagRegex = new RegExp(`#${hashtag}\\b`, 'g');
			try {
				verified = result.sug_list[0].cha_name;
			} catch (e) {
				errorr_list.push(e)
			}

			if (verified) {
				newDescription = newDescription.replace(hashtagRegex, `#${verified}`);
				markupText = markupText.replace(hashtagRegex, `<h id="${index}">#${verified}</h>`);
				hashtags.push(verified);
			}

		});


		for (const hashtag of hashtags) {
			const positionList = findAllHashtagContentPositions(newDescription, hashtag);
			for (const { start, end } of positionList) {
				textExtra.push({
					tag_id: `${index}`,
					start,
					end,
					user_id: '',
					type: 1,
					hashtag_name: hashtag,
				});
			}
			index++;
		}

		return {
			newDescription,
			textExtra,
			markupText,
			errorr_list

		};
	}

	private async releaseVideo(
		exc: IExecuteFunctions,
		creationID: string,
		videoId: string,
		description: string,
		scheduleTime: number,
	) {
		const { newDescription, textExtra, markupText,errorr_list } = await this.getTagsExtra(exc, description);

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
						music_info: {},
						poster_delay: 0,
						text: newDescription,
						text_extra: textExtra,
						markup_text: markupText,
					},
				},
			],
		};

		postQuery['X-Bogus'] = get_x_bogus(qs.stringify(postQuery), JSON.stringify(data), UA);

		await exc.helpers.request({
			method: 'POST',
			url: `${BASE_URL}/tiktok/web/project/post/v1/`,
			headers: {
				...(await this.getHeader(exc)),
				'content-type': 'application/json',
				origin: BASE_URL,
				referer: BASE_URL,
				Host: HOST,
			},
			qs: postQuery,
			body: data,
			json: true,
		});
		return JSON.stringify({
			markupText,
			newDescription,
			textExtra,
			errorr_list
		});
	}

	async uploadVideo(exc: IExecuteFunctions, step: number) {
		const description = exc.getNodeParameter(VIDEO_PARAMS.UPLOAD.DESCRIPTION, step) as string;
		const scheduleTime = exc.getNodeParameter(VIDEO_PARAMS.UPLOAD.SCHEDULE_TIME, step) as number;
		const binaryProperty = exc.getNodeParameter(
			VIDEO_PARAMS.UPLOAD.BINARY_PROPERTY,
			step,
		) as string;
		const binaryData = exc.helpers.assertBinaryData(step, binaryProperty);

		const { contentLength, fileContent } = await extractBinaryData(exc, binaryData);

		let creationID = '',
			project_id = '',
			accessKeyId = '',
			secretAccessKey = '',
			sessionToken = '',
			videoId = '',
			sessionKey = '',
			storeUri = '',
			uploadHost = '',
			videoAuth = {},
			uploadID = '',
			crcs = [];

		// step 1: authUpload

		try {
			const repsAuthUpload = await this.authUpload(exc);
			accessKeyId = repsAuthUpload.accessKeyId;
			secretAccessKey = repsAuthUpload.secretAccessKey;
			sessionToken = repsAuthUpload.sessionToken;
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 1,
					info: 'authUpload',
				},
				error,
			);
		}

		// step 2: initOneUpload
		try {
			const repsInitOneUpload = await this.initOneUpload(exc);
			creationID = repsInitOneUpload.creationID;
			project_id = repsInitOneUpload.project_id;
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 2,
					info: 'initOneUpload',
				},
				error,
			);
		}

		// step 3: signedUploadInfo

		try {
			const repsSignedUploadInfo = await this.signedUploadInfo(
				exc,
				accessKeyId,
				secretAccessKey,
				sessionToken,
				contentLength?.toString(),
			);
			videoId = repsSignedUploadInfo.videoId;
			sessionKey = repsSignedUploadInfo.sessionKey;
			storeUri = repsSignedUploadInfo.storeUri;
			uploadHost = repsSignedUploadInfo.uploadHost;
			videoAuth = repsSignedUploadInfo.videoAuth;
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 3,
					info: 'signedUploadInfo',
				},
				error,
			);
		}

		// step 4: Start Upload

		try {
			const repsStartUpload = await this.startUpload(exc, uploadHost, storeUri, videoAuth);
			uploadID = repsStartUpload.uploadID;
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 4,
					info: 'startUpload',
				},
				error,
			);
		}

		// step 5: uploadPart

		try {
			const repsUploadPart = await this.uploadDataChunk(
				exc,
				fileContent,
				uploadHost,
				storeUri,
				videoAuth,
				uploadID,
			);
			crcs = repsUploadPart;
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 5,
					info: 'uploadPart',
				},
				error,
			);
		}

		// step 6: completeUpload

		try {
			await this.completeUpload(exc, uploadHost, storeUri, videoAuth, uploadID, crcs);
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 6,
					info: 'completeUpload',
				},
				error,
			);
		}

		//step 7 :  Commit Upload (AWS SigV4)
		try {
			await this.commitUpload(exc, sessionKey, accessKeyId, secretAccessKey, sessionToken);
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 7,
					info: 'commitUpload',
				},
				error,
			);
		}
		let test = {};

		try {
			test = await this.releaseVideo(exc, creationID, videoId, description, scheduleTime);
		} catch (error) {
			videoException.captureUploadStep(
				{
					step: 8,
					info: 'releaseVideo',
				},
				error,
			);
		}

		return {
			creationID,
			project_id,
			test,
			videoId,
			// commitResponse,
		};
	}
}

export const videoHandler = new VideoHandler();
