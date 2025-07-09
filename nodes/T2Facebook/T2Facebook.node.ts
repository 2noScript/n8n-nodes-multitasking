import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionType } from 'n8n-workflow';
import { reelDescription, reelFields } from './src/ReelDescription';
import { allowUnauthorizedCerts, API_VERSION, hostUrl } from './src/settings';

export class T2Facebook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'T2Facebook',
		name: 't2Facebook',
		icon: 'file:facebook.svg',
		group: ['input'],
		version: 1,
		description: 'Basic Example Node',
		defaults: {
			name: 'Example Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'facebookGraphApi',
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
						name: 'Reels',
						value: 'video_reels',
					},
				],
				default: 'video_reels',
			},
			...reelDescription,
			...reelFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const returnData: INodeExecutionData[] = [];
		const baseUri = `https://${hostUrl}/${API_VERSION}`;
		const graphApiCredentials = await this.getCredentials('facebookGraphApi');

		for (let i = 0; i < items.length; i++) {
			try {
				const qs: IDataObject = {
					access_token: graphApiCredentials.accessToken,
				};
				if (resource === 'video_reels') {
					if (operation === 'upload') {
						qs['upload_phase'] = 'start';

						const sessionUploadRequestOption: IRequestOptions = {
							headers: {
								accept: 'application/json,text/*;q=0.99',
							},
							method: 'POST',
							json: true,
							gzip: true,
							uri: `${baseUri}/${graphApiCredentials.userId}/video_reels`,
							rejectUnauthorized: !allowUnauthorizedCerts,
							qs: qs,
						};

						// const title = this.getNodeParameter('title', i);
						// const description = this.getNodeParameter('description', i);
						sessionUploadRequestOption.qs = {
							...qs,
							upload_phase: 'start',
						};
						try {
							const responseSessionUpload = await this.helpers.request(sessionUploadRequestOption);
							returnData.push({ json: responseSessionUpload });
						} catch (error) {
							if (!this.continueOnFail()) {
								throw new NodeApiError(this.getNode(), error as JsonObject);
							}
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
							returnData.push({ json: { ...errorItem } });

							continue;
						}
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
		}

		return [returnData];
	}
}
