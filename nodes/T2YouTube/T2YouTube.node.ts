import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { videoFields, videoOperations } from './src/VideoDescription';

// import { Readable } from 'stream';
import { isoCountryCodes } from '../Shared/ISOCountryCodes';
import { googleApiRequestAllItems } from './src/GenericFunctions';

// const UPLOAD_CHUNK_SIZE = 1024 * 1024;

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
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Playlist',
						value: 'playlist',
					},
					{
						name: 'Playlist Item',
						value: 'playlistItem',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Video Category',
						value: 'videoCategory',
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

		return [items];
	}
}
