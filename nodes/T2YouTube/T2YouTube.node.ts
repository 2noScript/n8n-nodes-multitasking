import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { videoFields, videoOperations } from './src/VideoDescription';
//@ts-ignore
import { Readable } from 'stream';
import { isoCountryCodes } from '../Shared/ISOCountryCodes';
import {
	googleApiRequest,
	googleApiRequestAllItems,
	validateAndSetDate,
} from './src/GenericFunctions';
import { Buffer } from 'buffer';

const UPLOAD_CHUNK_SIZE = 1024 * 1024;

export class T2YouTube implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'T2YouTube',
		name: 't2YouTube',
		icon: 'file:t2YouTube.svg',
		group: ['input'],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		version: 1,
		description: 'T2YouTube Node',
		defaults: {
			name: 'T2YouTube Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'youTubeOAuth2Api',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Video',
						value: 'video',
					},
				],
				default: 'channel',
			},
			...videoOperations,
			...videoFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the languages to display them to user so that they can
			// select them easily
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const languages = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/youtube/v3/i18nLanguages',
				);
				for (const language of languages) {
					const languageName = language.id.toUpperCase();
					const languageId = language.id;
					returnData.push({
						name: languageName,
						value: languageId,
					});
				}
				return returnData;
			},
			// Get all the countries codes to display them to user so that they can
			// select them easily
			async getCountriesCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const countryCode of isoCountryCodes) {
					const countryCodeName = `${countryCode.name} - ${countryCode.alpha2}`;
					const countryCodeId = countryCode.alpha2;
					returnData.push({
						name: countryCodeName,
						value: countryCodeId,
					});
				}
				return returnData;
			},
			// Get all the video categories to display them to user so that they can
			// select them easily
			async getVideoCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const countryCode = this.getCurrentNodeParameter('regionCode') as string;

				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.regionCode = countryCode;
				qs.part = 'snippet';
				const categories = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/youtube/v3/videoCategories',
					{},
					qs,
				);
				for (const category of categories) {
					const categoryName = category.snippet.title;
					const categoryId = category.id;
					returnData.push({
						name: categoryName,
						value: categoryId,
					});
				}
				return returnData;
			},
			// Get all the playlists to display them to user so that they can
			// select them easily
			async getPlaylists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.part = 'snippet';
				qs.mine = true;
				const playlists = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/youtube/v3/playlists',
					{},
					qs,
				);
				for (const playlist of playlists) {
					const playlistName = playlist.snippet.title;
					const playlistId = playlist.id;
					returnData.push({
						name: playlistName,
						value: playlistId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'video') {
					//https://developers.google.com/youtube/v3/docs/search/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						const filters = this.getNodeParameter('filters', i);

						qs.part = 'snippet';

						qs.type = 'video';

						qs.forMine = true;

						if (filters.publishedAfter) {
							validateAndSetDate(filters, 'publishedAfter', this.getTimezone(), this);
						}

						if (filters.publishedBefore) {
							validateAndSetDate(filters, 'publishedBefore', this.getTimezone(), this);
						}

						Object.assign(qs, options, filters);

						if (Object.keys(filters).length > 0) {
							delete qs.forMine;
						}

						if (qs.relatedToVideoId && qs.forDeveloper !== undefined) {
							throw new NodeOperationError(
								this.getNode(),
								"When using the parameter 'related to video' the parameter 'for developer' cannot be set",
								{ itemIndex: i },
							);
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/youtube/v3/search',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(this, 'GET', '/youtube/v3/search', {}, qs);
							responseData = responseData.items;
						}
					}
					//https://developers.google.com/youtube/v3/docs/videos/list?hl=en
					if (operation === 'get') {
						let part = this.getNodeParameter('part', i) as string[];
						const videoId = this.getNodeParameter('videoId', i) as string;
						const options = this.getNodeParameter('options', i);

						if (part.includes('*')) {
							part = [
								'contentDetails',
								'id',
								'liveStreamingDetails',
								'localizations',
								'player',
								'recordingDetails',
								'snippet',
								'statistics',
								'status',
								'topicDetails',
							];
						}

						qs.part = part.join(',');

						qs.id = videoId;

						Object.assign(qs, options);

						responseData = await googleApiRequest.call(this, 'GET', '/youtube/v3/videos', {}, qs);

						responseData = responseData.items;
					}
					//https://developers.google.com/youtube/v3/guides/uploading_a_video?hl=en
					if (operation === 'upload') {
						const title = this.getNodeParameter('title', i) as string;
						const categoryId = this.getNodeParameter('categoryId', i) as string;
						const options = this.getNodeParameter('options', i);
						const binaryProperty = this.getNodeParameter('binaryProperty', i);

						const binaryData = this.helpers.assertBinaryData(i, binaryProperty);

						let mimeType: string;
						let contentLength: number;
						let fileContent: Readable;

						if (binaryData.id) {
							// Stream data in 256KB chunks, and upload the via the resumable upload api
							fileContent = await this.helpers.getBinaryStream(binaryData.id, UPLOAD_CHUNK_SIZE);
							const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
							contentLength = metadata.fileSize;
							mimeType = metadata.mimeType ?? binaryData.mimeType;
						} else {
							const buffer = Buffer.from(binaryData.data, BINARY_ENCODING);
							fileContent = Readable.from(buffer);
							contentLength = buffer.length;
							mimeType = binaryData.mimeType;
						}

						const payload = {
							snippet: {
								title,
								categoryId,
								description: options.description,
								tags: (options.tags as string)?.split(','),
								defaultLanguage: options.defaultLanguage,
							},
							status: {
								privacyStatus: options.privacyStatus,
								embeddable: options.embeddable,
								publicStatsViewable: options.publicStatsViewable,
								publishAt: options.publishAt,
								selfDeclaredMadeForKids: options.selfDeclaredMadeForKids,
								license: options.license,
							},
							recordingDetails: {
								recordingDate: options.recordingDate,
							},
						};

						const resumableUpload = await googleApiRequest.call(
							this,
							'POST',
							'/upload/youtube/v3/videos',
							payload,
							{
								uploadType: 'resumable',
								part: 'snippet,status,recordingDetails',
								notifySubscribers: options.notifySubscribers ?? false,
							},
							undefined,
							{
								headers: {
									'X-Upload-Content-Length': contentLength,
									'X-Upload-Content-Type': mimeType,
								},
								json: true,
								resolveWithFullResponse: true,
							},
						);

						const uploadUrl = resumableUpload.headers.location;

						let uploadId;
						let offset = 0;
						for await (const chunk of fileContent) {
							const nextOffset = offset + Number(chunk.length);
							try {
								const response = await this.helpers.httpRequest({
									method: 'PUT',
									url: uploadUrl,
									headers: {
										'Content-Length': chunk.length,
										'Content-Range': `bytes ${offset}-${nextOffset - 1}/${contentLength}`,
									},
									body: chunk,
								});
								uploadId = response.id;
							} catch (error) {
								if (error.response?.status !== 308) throw error;
							}
							offset = nextOffset;
						}

						responseData = { uploadId, ...resumableUpload.body };
					}
					//https://developers.google.com/youtube/v3/docs/playlists/update
					if (operation === 'update') {
						const id = this.getNodeParameter('videoId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const categoryId = this.getNodeParameter('categoryId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						qs.part = 'snippet, status, recordingDetails';

						const body = {
							id,
							snippet: {
								title,
								categoryId,
							},
							status: {},
							recordingDetails: {},
						};

						if (updateFields.description) {
							//@ts-ignore
							body.snippet.description = updateFields.description as string;
						}

						if (updateFields.privacyStatus) {
							//@ts-ignore
							body.status.privacyStatus = updateFields.privacyStatus as string;
						}

						if (updateFields.tags) {
							//@ts-ignore
							body.snippet.tags = (updateFields.tags as string).split(',');
						}

						if (updateFields.embeddable) {
							//@ts-ignore
							body.status.embeddable = updateFields.embeddable as boolean;
						}

						if (updateFields.publicStatsViewable) {
							//@ts-ignore
							body.status.publicStatsViewable = updateFields.publicStatsViewable as boolean;
						}

						if (updateFields.publishAt) {
							//@ts-ignore
							body.status.publishAt = updateFields.publishAt as string;
						}

						if (updateFields.selfDeclaredMadeForKids) {
							//@ts-ignore
							body.status.selfDeclaredMadeForKids = updateFields.selfDeclaredMadeForKids as boolean;
						}

						if (updateFields.recordingDate) {
							//@ts-ignore
							body.recordingDetails.recordingDate = updateFields.recordingDate as string;
						}

						if (updateFields.license) {
							//@ts-ignore
							body.status.license = updateFields.license as string;
						}

						if (updateFields.defaultLanguage) {
							//@ts-ignore
							body.snippet.defaultLanguage = updateFields.defaultLanguage as string;
						}

						responseData = await googleApiRequest.call(this, 'PUT', '/youtube/v3/videos', body, qs);
					}
					//https://developers.google.com/youtube/v3/docs/videos/delete?hl=en
					if (operation === 'delete') {
						const videoId = this.getNodeParameter('videoId', i) as string;
						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							id: videoId,
						};

						if (options.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = options.onBehalfOfContentOwner as string;
						}

						responseData = await googleApiRequest.call(this, 'DELETE', '/youtube/v3/videos', body);

						responseData = { success: true };
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return [returnData];
	}
}
