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
                description: 'Upload a Reel',
                action: 'Upload a Reel',
            },
        ],
        default: 'upload',
    },
];

export const videoFields: INodeProperties[] = [
    {
        displayName: 'Title',
        name: 'title',
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
        displayName: 'Tags',
        name: 'tags',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                operation: ['upload'],
                resource: ['video'],
            },
        },
        default: '',
        description: "The video's tags",
    },
    // {
    //     displayName: 'Input Binary Field',
    //     name: 'binaryProperty',
    //     type: 'string',
    //     required: true,
    //     hint: 'The name of the input binary field containing the file to be uploaded',
    //     displayOptions: {
    //         show: {
    //             operation: ['upload'],
    //             resource: ['video'],
    //         },
    //     },
    //     default: 'data',
    // },
    {
        displayName: 'Update Fields',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
            show: {
                operation: ['upload'],
                resource: ['video'],
            },
        },
        options: [
            {
                displayName: 'url_prefix',
                name: 'url_prefix',
                type: 'options',
                options: [
                    {
                        name: 'www',
                        value: 'www',
                    },
                    {
                        name: 'us',
                        value: 'us',
                    },
                ],
                default: 'www',
                description: 'Publish status',
            },
            {
				displayName: 'Schedule Time',
				name: 'schedule_time',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the video was recorded',
			},
        ],
    },
];
