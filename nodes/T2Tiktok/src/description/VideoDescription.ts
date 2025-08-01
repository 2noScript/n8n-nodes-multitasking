import type { INodeProperties } from 'n8n-workflow';

export const videoDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['video'],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a Video',
				action: 'Upload a Video',
			},
		],
		default: 'upload',
	},
];

export const videoFields: INodeProperties[] = [
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video'],
			},
		},
		default: '',
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
				resource: ['video'],
			},
		},
		default: 'data',
	},
	{
		displayName: 'Schedule Time',
		name: 'scheduleTime',
		type: 'options',
		default: 0,
		description: 'The date and time when the video was recorded',
		required: true,
		options: [
			{
				name: 'Now',
				value: 0,
			},
			{
				name: '15 minute',
				value: 900,
			},
			{
				name: '30 minute',
				value: 1800,
			},
			{
				name: '1 hour',
				value: 3600,
			},
			{
				name: '2 hour',
				value: 7200,
			},
			{
				name: '5 hour',
				value: 18000,
			},
			{
				name: '1 day',
				value: 86400,
			},
			{
				name: '2 day',
				value: 172800,
			},
			{
				name: '3 day',
				value: 259200,
			},

			{
				name: '4 day',
				value: 345600,
			},
			{
				name: '5 day',
				value: 432000,
			},
			{
				name: '6 day',
				value: 518400,
			},
			{
				name: '7 day',
				value: 604800,
			},
			{
				name: '8 day',
				value: 691200,
			},
			{
				name: '9 day',
				value: 777600,
			},
			{
				name: '10 day',
				value: 864000,
			},
		],
	},
];
