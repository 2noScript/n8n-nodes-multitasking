import * as crypto from 'crypto';

function decode(str: string): number[] {
	const map: Record<number, number> = {};
	'0123456789abcdef'.split('').forEach((c, i) => {
		map[c.charCodeAt(0)] = i;
	});
	const arr: number[] = [];
	for (let i = 0; i < 32; i += 2) {
		arr.push((map[str.charCodeAt(i)] << 4) | map[str.charCodeAt(i + 1)]);
	}
	return arr;
}

function md5_string(str: string): string {
	return crypto.createHash('md5').update(str).digest('hex');
}

function md5_arry(arr: number[]): string {
	return crypto.createHash('md5').update(Buffer.from(arr)).digest('hex');
}

function encodeWithKey(key: number[], data: string): string {
	const result = Array.from({ length: 256 }, (_, i) => i);
	let j = 0;
	let output = '';

	for (let i = 0; i < 256; i++) {
		j = (j + result[i] + key[i % key.length]) % 256;
		[result[i], result[j]] = [result[j], result[i]];
	}

	let i = 0;
	j = 0;
	for (let k = 0; k < data.length; k++) {
		i = (i + 1) % 256;
		j = (j + result[i]) % 256;
		[result[i], result[j]] = [result[j], result[i]];
		const idx = (result[i] + result[j]) % 256;
		output += String.fromCharCode(data.charCodeAt(k) ^ result[idx]);
	}
	return output;
}

function b64_encode(str: string, keyTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="): string {
	const bytes = Buffer.from(str, 'binary');
	let output = '';
	for (let i = 0; i < bytes.length; i += 3) {
		const [b1, b2 = 0, b3 = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
		const temp = [
			b1 >> 2,
			((b1 & 0x03) << 4) | (b2 >> 4),
			((b2 & 0x0f) << 2) | (b3 >> 6),
			b3 & 0x3f
		];
		if (i + 1 >= bytes.length) temp[2] = 64;
		if (i + 2 >= bytes.length) temp[3] = 64;
		output += temp.map(v => keyTable[v]).join('');
	}
	return output;
}

function cal_num_list(numList: number[]): number[] {
	const order = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 4, 6, 8, 10, 12, 14, 16, 18, 20];
	return order.map(i => numList[i - 1]);
}

function _0x22a2b6(...args: number[]): string {
	return args.map(x => String.fromCharCode(x)).join('');
}

function _0x263a8b(str: string): string {
	return '\x02ÿ' + str;
}

export function get_x_bogus(params: string, data: string, userAgent: string): string {
	const s0 = md5_string(data);
	const s1 = md5_string(params);
	const s0_1 = md5_arry(decode(s0));
	const s1_1 = md5_arry(decode(s1));
	const d = encodeWithKey([0, 1, 12], userAgent);
	const ua_str = b64_encode(d);
	const ua_str_md5 = md5_string(ua_str);

	const timestamp = Math.floor(Date.now() / 1000);
	const canvas = 536919696;

	const salt_list = [
		timestamp, canvas, 64, 0, 1, 12,
		decode(s1_1).slice(-2)[0],
		decode(s1_1).slice(-1)[0],
		decode(s0_1).slice(-2)[0],
		decode(s0_1).slice(-1)[0],
		decode(ua_str_md5).slice(-2)[0],
		decode(ua_str_md5).slice(-1)[0],
	];

	for (let shift of [24, 16, 8, 0]) salt_list.push((timestamp >> shift) & 255);
	for (let shift of [24, 16, 8, 0]) salt_list.push((canvas >> shift) & 255);

	let _tem = 64;
	for (let x of salt_list.slice(3)) _tem ^= x;

	salt_list.push(_tem, 255);

	const num_list = cal_num_list(salt_list);
	const short_str_2 = encodeWithKey([255], _0x22a2b6(...num_list));
	const short_str_3 = _0x263a8b(short_str_2);

	return b64_encode(short_str_3, "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe");
}
