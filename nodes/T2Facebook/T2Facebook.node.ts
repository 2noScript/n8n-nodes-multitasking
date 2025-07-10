import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import {  NodeApiError, NodeConnectionType } from 'n8n-workflow';
import { reelDescription, reelFields } from './src/description/ReelDescription';
import { captureError } from './src/GenericFunctions';
//@ts-ignore
import { Readable } from 'stream';
import {reelHandler,Publish} from './src/handlers/reelHandler';

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

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'video_reels') {
					if (operation === 'upload') {
						try {
							const title = this.getNodeParameter('title', i) as string;
							const description = this.getNodeParameter('description', i) as string;
							const binaryProperty = this.getNodeParameter('binaryProperty', i);
							const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
							const updateFields = this.getNodeParameter('updateFields', i);

							const rs = await reelHandler.uploadReel(this, title, description, binaryData,updateFields.publish as Publish );
							returnData.push({ json: rs });
						} catch (error) {
							if (!this.continueOnFail()) {
								throw new NodeApiError(this.getNode(), error as JsonObject);
							}

							returnData.push({ json: captureError(error) });
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
