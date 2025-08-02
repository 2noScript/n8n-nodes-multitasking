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
		options: [
			// {
			// 	name: 'Delete',
			// 	value: 'delete',
			// 	description: 'Delete a Reel',
			// 	action: 'Delete a Reel',
			// },
			// {
			// 	name: 'Get',
			// 	value: 'get',
			// 	description: 'Get a Reel',
			// 	action: 'Get a Reel',
			// },
			// {
			// 	name: 'Get Many',
			// 	value: 'getAll',
			// 	description: 'Retrieve many Reels',
			// 	action: 'Get many Reels',
			// },
			// {
			// 	name: 'Update',
			// 	value: 'update',
			// 	description: 'Update a Reel',
			// 	action: 'Update a Reel',
			// },
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a Reel',
				action: 'Upload a Reel',
			},
		],
		default: 'upload',
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
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video_reels'],
			},
		},
		default: '',
		description: "The video's description",
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		hint: 'The name of the input binary field containing the file to be uploaded',
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video_reels'],
			},
		},
		default: 'data',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video_reels'],
			},
		},
		options: [
			{
				displayName: 'Publish',
				name: 'publish',
				type: 'options',
				options: [
					{
						name: 'Published',
						value: 'PUBLISHED',
					},
					{
						name: 'Draft',
						value: 'DRAFT',
					},
				],
				default: 'DRAFT',
				description: 'Publish status',
			},
		],
	},
];
