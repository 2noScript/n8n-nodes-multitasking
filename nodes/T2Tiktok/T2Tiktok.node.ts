import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
//@ts-ignore
import { Readable } from 'stream';
import { videoDescription, videoFields } from './src/description/VideoDescription';
import { videoHandler } from './src/handlers/videoHandler';
import { OPERATION, RESOURCE } from './src/settings';

export class T2Tiktok implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'T2Tiktok',
		name: 't2Tiktok',
		icon: 'file:T2Tiktok.svg',
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
				name: 'tiktokApi',
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
				default: 'video',
			},
			...videoDescription,
			...videoFields
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter(RESOURCE, 0);
		const operation = this.getNodeParameter(OPERATION, 0);
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
            try{
               if(resource==="video"){
					if(operation==="upload"){
						const resultUploadVideo = await videoHandler.uploadVideo(this, i);
						returnData.push({ json:resultUploadVideo });
					}
			   }
			}
			catch(error){
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
