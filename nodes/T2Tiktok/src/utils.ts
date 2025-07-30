import aws4 from 'aws4';
// import crypto from 'crypto';

export function getCreationId() {
	const length = 21;
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let creationid = '';
	for (let i = 0; i < length; i++) {
		creationid += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return creationid;
}

export function getAWS(accessKeyId: string, secretAccessKey: string, sessionToken: string) {


  const queryParams = new URLSearchParams({
		Action: 'ApplyUploadInner',
		Version: '2020-11-19',
		SpaceName: 'tiktok',
		FileType: 'video',
		IsInner: '1',
		FileSize: "12345678",
		s: 'g158iqx8434',
	}).toString();

	const requestOptions = {
		// host: 'vod.ap-singapore-1.amazonaws.com',
		// path: '/ListAssets?maxResults=10',
		// method: 'GET',
		// headers: {
		// 	'Content-Type': 'application/json',
		// },
		// service: 'vod',
		// region: 'ap-singapore-1',

			host: 'www.tiktok.com',
			path: `/top/v1?${queryParams}`,
			service: 'vod',
			region: 'ap-singapore-1',
			method: 'GET',
	};

	const signed = aws4.sign(requestOptions, {
		accessKeyId,
		secretAccessKey,
		sessionToken,
	});

	return signed;
}
