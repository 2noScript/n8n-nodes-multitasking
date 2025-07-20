import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class TiktokApi implements ICredentialType {
	name = 'tiktokApi';
	displayName = 'Tiktok API';
	documentationUrl = 'tiktokApi';

	properties: INodeProperties[] = [
		{
			displayName: 'Cookie',
			name: 'cookie',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		if (!requestOptions.headers) {
			requestOptions.headers = {};
		}
		requestOptions.headers['Cookie'] = credentials.cookie as string;
		return requestOptions;
	}
}
