import type { INodeProperties } from 'n8n-workflow';

export const reelDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['video_reels'],
			},
		},
		options: [],
		default: 'getAll',
	},
];

export const reelFields: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video_reels'],
			},
		},
		default: '',
	},
];
