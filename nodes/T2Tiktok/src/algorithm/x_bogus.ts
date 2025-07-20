import CryptoJS from 'crypto-js';

function decode(str: string) {
	const _0x50ff23: Record<number, number> = {
		48: 0,
		49: 1,
		50: 2,
		51: 3,
		52: 4,
		53: 5,
		54: 6,
		55: 7,
		56: 8,
		57: 9,
		97: 10,
		98: 11,
		99: 12,
		100: 13,
		101: 14,
		102: 15,
	};
	const arr = [];
	for (let i = 0; i < 32; i += 2) {
		arr.push((_0x50ff23[str.charCodeAt(i)] << 4) | _0x50ff23[str.charCodeAt(i + 1)]);
	}
	return arr;
}

function md5_arry(arr: number[]) {
	const wordArray = CryptoJS.lib.WordArray.create(arr);
	return CryptoJS.MD5(wordArray).toString();
}

function md5_string(s: string) {
	return CryptoJS.MD5(s).toString();
}

function encodeWithKey(key: any, data: any) {
	const result = new Array(256);
	let temp = 0;
	let output = '';
	for (let i = 0; i < 256; i++) {
		result[i] = i;
	}
	for (let i = 0; i < 256; i++) {
		temp = (temp + result[i] + key[i % key.length]) % 256;
		const temp1 = result[i];
		result[i] = result[temp];
		result[temp] = temp1;
	}
	let temp2 = 0;
	temp = 0;
	for (let i = 0; i < data.length; i++) {
		temp2 = (temp2 + 1) % 256;
		temp = (temp + result[temp2]) % 256;
		const temp1 = result[temp2];
		result[temp2] = result[temp];
		result[temp] = temp1;
		output += String.fromCharCode(
			data.charCodeAt(i) ^ result[(result[temp2] + result[temp]) % 256],
		);
	}
	return output;
}

function b64_encode(
	str: string,
	key_table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
) {
	const last_list = [];
	for (let i = 0; i < str.length; i += 3) {
		let num_1 = str.charCodeAt(i);
		let num_2 = str.charCodeAt(i + 1);
		let num_3 = str.charCodeAt(i + 2);

		if (isNaN(num_2)) num_2 = 0;
		if (isNaN(num_3)) num_3 = 0;

		let arr_1 = num_1 >> 2;
		let arr_2 = ((3 & num_1) << 4) | (num_2 >> 4);
		let arr_3 = ((15 & num_2) << 2) | (num_3 >> 6);
		let arr_4 = 63 & num_3;

		if (i + 1 >= str.length) {
			arr_3 = 64;
			arr_4 = 64;
		} else if (i + 2 >= str.length) {
			arr_4 = 64;
		}

		last_list.push(arr_1, arr_2, arr_3, arr_4);
	}
	return last_list.map((value) => key_table[value]).join('');
}

function cal_num_list(_num_list: any): any {
	const new_num_list: any[] = [];
	for (const x of [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
		new_num_list.push(_num_list[x - 1]);
	}
	return new_num_list;
}

function _0x22a2b6(
	_0x59d7ab: any,
	_0x151cde: any,
	_0x1e0c94: any,
	_0x54aa83: any,
	_0x76d8ab: any,
	_0x550bdb: any,
	_0xb90041: any,
	_0x44b16d: any,
	_0x28659f: any,
	_0x252c2c: any,
	_0x365218: any,
	_0x48af11: any,
	_0x25e3db: any,
	_0x34084f: any,
	_0x4f0729: any,
	_0x46a34c: any,
	_0x1f67f1: any,
	_0x5cd529: any,
	_0x53097b: any,
) {
	const _0xa0a6ac = new Array(19).fill(0);
	_0xa0a6ac[0] = _0x59d7ab;
	_0xa0a6ac[1] = _0x365218;
	_0xa0a6ac[2] = _0x151cde;
	_0xa0a6ac[3] = _0x48af11;
	_0xa0a6ac[4] = _0x1e0c94;
	_0xa0a6ac[5] = _0x25e3db;
	_0xa0a6ac[6] = _0x54aa83;
	_0xa0a6ac[7] = _0x34084f;
	_0xa0a6ac[8] = _0x76d8ab;
	_0xa0a6ac[9] = _0x4f0729;
	_0xa0a6ac[10] = _0x550bdb;
	_0xa0a6ac[11] = _0x46a34c;
	_0xa0a6ac[12] = _0xb90041;
	_0xa0a6ac[13] = _0x1f67f1;
	_0xa0a6ac[14] = _0x44b16d;
	_0xa0a6ac[15] = _0x5cd529;
	_0xa0a6ac[16] = _0x28659f;
	_0xa0a6ac[17] = _0x53097b;
	_0xa0a6ac[18] = _0x252c2c;
	return String.fromCharCode(..._0xa0a6ac);
}

function _0x263a8b(_0x2a0483: any) {
	return '\u0002' + 'ÿ' + _0x2a0483;
}

export function get_x_bogus(params: any, data: any, user_agent: any) {
	const s0 = md5_string(data);
	const s1 = md5_string(params);
	const s0_1 = md5_arry(decode(s0));
	const s1_1 = md5_arry(decode(s1));
	const d = encodeWithKey([0, 1, 12], user_agent);
	const ua_str = b64_encode(d);
	const ua_str_md5 = md5_string(ua_str);
	const timestamp = Math.floor(Date.now() / 1000);
	const canvas = 536919696;

	const salt_list = [
		timestamp,
		canvas,
		64,
		0,
		1,
		12,
		decode(s1_1).slice(-2)[0],
		decode(s1_1).slice(-1)[0],
		decode(s0_1).slice(-2)[0],
		decode(s0_1).slice(-1)[0],
		decode(ua_str_md5).slice(-2)[0],
		decode(ua_str_md5).slice(-1)[0],
	];

	for (const x of [24, 16, 8, 0]) {
		salt_list.push((timestamp >> x) & 255);
	}
	for (const x of [24, 16, 8, 0]) {
		salt_list.push((canvas >> x) & 255);
	}

	let _tem = 64;
	for (const x of salt_list.slice(3)) {
		_tem ^= x;
	}

	salt_list.push(_tem);
	salt_list.push(255);

	const num_list: any = cal_num_list(salt_list);
	const str = _0x22a2b6(
		...(num_list as [
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
			any,
		]),
	);
	const short_str_2 = encodeWithKey([255], str);
	const short_str_3 = _0x263a8b(short_str_2);
	const x_b = b64_encode(
		short_str_3,
		'Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe',
	);
	return x_b;
}

// Test
// console.log(get_x_bogus(
//     "msToken=",
//     '{"keyword_list":["口红"],"start_date":"20220529","end_date":"20220629","app_name":"aweme"}',
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
// ));
