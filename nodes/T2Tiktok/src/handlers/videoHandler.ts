import { IBinaryData, IExecuteFunctions } from 'n8n-workflow';

class VideoHandler {
	UA =
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36';
	MIN_MARGIN_SCHEDULE_TIME = 900; // 15 minutes
	MAX_MARGIN_SCHEDULE_TIME = 864000; // 10 days
	MARGIN_TO_UPLOAD_VIDEO = 300; // 5 minutes

	private getCreationId() {
		const length = 21;
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let creationid = '';
		for (let i = 0; i < length; i++) {
			creationid += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		return creationid;
	}

	private async getHeader(exc: IExecuteFunctions) {
		const tiktokApi = await exc.getCredentials('tiktokApi');

		return {
			'User-Agent': this.UA,
			'X-Secsdk-Csrf-Request': '1',
			'X-Secsdk-Csrf-Version': '1.2.8',
			Cookie: tiktokApi.cookie,
		};
	}

	// private checkScheduleTime(schedule_time_num: number) {
	// 	if (schedule_time_num < this.MIN_MARGIN_SCHEDULE_TIME) {
	// 		schedule_time_num = this.MIN_MARGIN_SCHEDULE_TIME;
	// 	}
	// 	if (schedule_time_num > this.MAX_MARGIN_SCHEDULE_TIME) {
	// 		schedule_time_num = this.MAX_MARGIN_SCHEDULE_TIME;
	// 	}
	// 	return schedule_time_num;
	// }

	async uploadVideo(
		exc: IExecuteFunctions,
		title: string,
		tags: string,
		binaryData?: IBinaryData,
		url_prefix?: string,
		schedule_time?: number,
	) {
		const headers = await this.getHeader(exc);
		const creation_id = this.getCreationId();
		const url_creation = `https://${url_prefix ?? 'www'}.tiktok.com/api/v1/web/project/create/?creation_id=${creation_id}&type=1&aid=1988`;

		// const res_url_creation = await exc.helpers.request({
		//     method: 'POST',
		//     url: url_creation,
		//     headers,
		// });

		return {
			url_prefix,
			title,
			tags,
			UA: this.UA,
			schedule_time,
			headers,
			url_creation,
		};
	}
}

export const reelHandler = new VideoHandler();
