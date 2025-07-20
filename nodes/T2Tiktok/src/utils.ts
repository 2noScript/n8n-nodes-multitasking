// import axios from 'axios';
// import CryptoJS from 'crypto-js';
// import { Buffer } from 'buffer';
// import CRC32 from 'crc-32';

// function sign(key:any, msg:any) {
//   const keyWords = typeof key === 'string' ? CryptoJS.enc.Utf8.parse(key) : key;
//   const message = CryptoJS.enc.Utf8.parse(msg);
//   const hmac = CryptoJS.HmacSHA256(message, keyWords);
//   return CryptoJS.enc.Hex.parse(hmac.toString());
// }

// function getCreationId() {
//   const length = 21;
//   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//   let creationid = '';
//   for (let i = 0; i < length; i++) {
//     creationid += characters.charAt(Math.floor(Math.random() * characters.length));
//   }
//   return creationid;
// }

// function getSignatureKey(key:any, dateStamp:any, regionName:any, serviceName:any) {
//   const kDate = sign("AWS4" + key, dateStamp);
//   const kRegion = sign(kDate, regionName);
//   const kService = sign(kRegion, serviceName);
//   const kSigning = sign(kService, 'aws4_request');
//   return kSigning;
// }

// function getAWS(access_key:any, secret_key:any, session_token:any, region:any) {
//   return {
//     accessKeyId: access_key,
//     secretAccessKey: secret_key,
//     sessionToken: session_token,
//     region: region,
//     service: 'vod'
//   };
// }

// function AWSsignature(access_key:any, secret_key:any, request_parameters:any, headers:any, method = "GET", payload = '', region = "ap-singapore-1", service = "vod") {
//   const canonical_uri = '/';
//   const canonical_querystring = request_parameters;
//   const canonical_headers = Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n') + '\n';
//   const signed_headers = Object.keys(headers).join(';');
//   const payload_hash = CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);

//   const canonical_request = [
//     method,
//     canonical_uri,
//     canonical_querystring,
//     canonical_headers,
//     signed_headers,
//     payload_hash
//   ].join('\n');

//   const amzdate = headers['x-amz-date'];
//   const datestamp = amzdate.split('T')[0];

//   const algorithm = 'AWS4-HMAC-SHA256';
//   const credential_scope = `${datestamp}/${region}/${service}/aws4_request`;
//   const hash_canonical_request = CryptoJS.SHA256(canonical_request).toString(CryptoJS.enc.Hex);

//   const string_to_sign = [
//     algorithm,
//     amzdate,
//     credential_scope,
//     hash_canonical_request
//   ].join('\n');

//   const signing_key = getSignatureKey(secret_key, datestamp, region, service);
//   const signature = CryptoJS.HmacSHA256(string_to_sign, signing_key).toString(CryptoJS.enc.Hex);
//   return signature;
// }

// function crc32(content:any) {
//   const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
//   const result = CRC32.buf(buffer) >>> 0; // Ensure unsigned 32-bit integer
//   return result.toString(16).padStart(8, '0');
// }



// function assertSuccess(url:any, r:any) {
//   if (r.status !== 200) {
//     return false;
//   }
//   return true;
// }



// async function getTagsExtra(title:any, tags:any, users:any, session:any, url_prefix:any) {
//   const text_extra = [];

//   for (let tag of tags) {
//     const url = `https://www.tiktok.com/api/upload/challenge/sug/`;
//     const r = await session.get(url, { params: { keyword: tag } });
//     if (!assertSuccess(url, r)) return false;
//     let verified_tag = tag;
//     try {
//       verified_tag = r.data.sug_list[0].cha_name;
//     } catch { }
//     title += ` #${verified_tag}`;
//     text_extra.push({
//       start: title.length - verified_tag.length - 1,
//       end: title.length,
//       user_id: '',
//       type: 1,
//       hashtag_name: verified_tag
//     });
//   }

//   for (let user of users) {
//     const url = `https://${url_prefix}.tiktok.com/api/upload/search/user/`;
//     const r = await session.get(url, { params: { keyword: user } });
//     if (!assertSuccess(url, r)) return false;

//     let verified_user = user;
//     let verified_user_id = '';
//     try {
//       verified_user = r.data.user_list[0].user_info.unique_id;
//       verified_user_id = r.data.user_list[0].user_info.uid;
//     } catch { }

//     title += ` @${verified_user}`;
//     text_extra.push({
//       start: title.length - verified_user.length - 1,
//       end: title.length,
//       user_id: verified_user_id,
//       type: 0,
//       hashtag_name: verified_user
//     });
//   }

//   return [title, text_extra];
// }

// async function uploadToTikTok(video, session) {
//   const authRes = await session.get("https://www.tiktok.com/api/v1/video/upload/auth/");
//   const { access_key_id: access_key, secret_acess_key: secret_key, session_token } = authRes.data.video_token_v5;
//   const video_content = await fs.readFile(video);
//   const file_size = video_content.length;

//   const url = "https://www.tiktok.com/top/v1";
//   const request_parameters = `Action=ApplyUploadInner&Version=2020-11-19&SpaceName=tiktok&FileType=video&IsInner=1&FileSize=${file_size}&s=g158iqx8434`;

//   const r = await session.get(`${url}?${request_parameters}`);
//   if (!assertSuccess(url, r)) return false;

//   const upload_node = r.data.Result.InnerUploadAddress.UploadNodes[0];
//   const { Vid: video_id, UploadHost: upload_host, SessionKey: session_key } = upload_node;
//   const { StoreUri: store_uri, Auth: video_auth } = upload_node.StoreInfos[0];

//   const boundary = '---------------------------' + Math.random().toString().slice(2);
//   const headers = {
//     "Authorization": video_auth,
//     "Content-Type": `multipart/form-data; boundary=${boundary}`
//   };
//   const data = `--${boundary}--`;
//   const uploadInitRes = await session.post(`https://${upload_host}/${store_uri}?uploads`, data, { headers });
//   if (!assertSuccess(url, uploadInitRes)) return false;
//   const upload_id = uploadInitRes.data.payload.uploadID;

//   const chunk_size = 5242880;
//   const chunks = [];
//   for (let i = 0; i < file_size; i += chunk_size) {
//     chunks.push(video_content.slice(i, i + chunk_size));
//   }

//   const crcs = [];
//   for (let i = 0; i < chunks.length; i++) {
//     const chunk = chunks[i];
//     const crc = crc32(chunk);
//     crcs.push(crc);
//     const partUrl = `https://${upload_host}/${store_uri}?partNumber=${i + 1}&uploadID=${upload_id}`;
//     const headers = {
//       "Authorization": video_auth,
//       "Content-Type": "application/octet-stream",
//       "Content-Disposition": 'attachment; filename="undefined"',
//       "Content-Crc32": crc
//     };
//     const res = await session.post(partUrl, chunk, { headers });
//     if (!assertSuccess(partUrl, res)) return false;
//   }

//   const completeUrl = `https://${upload_host}/${store_uri}?uploadID=${upload_id}`;
//   const completeHeaders = {
//     "Authorization": video_auth,
//     "origin": "https://www.tiktok.com",
//     "Content-Type": "text/plain;charset=UTF-8"
//   };
//   const completeData = crcs.map((crc, i) => `${i + 1}:${crc}`).join(',');

//   const finalRes = await axios.post(completeUrl, completeData, {
//     headers: completeHeaders,
//     httpsAgent: new https.Agent({ rejectUnauthorized: false })
//   });
//   if (!assertSuccess(completeUrl, finalRes)) return false;

//   const commitUrl = "https://vod-ap-singapore-1.bytevcloudapi.com/";
//   const request_parameters_commit = 'Action=CommitUploadInner&SpaceName=tiktok&Version=2020-11-19';
//   const now = new Date();
//   const amzdate = now.toISOString().replace(/[:-]|\..*/g, '') + 'Z';
//   const datestamp = amzdate.slice(0, 8);
//   const payload = JSON.stringify({ SessionKey: session_key, Functions: [] });
//   const sha256 = CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);

//   const headers_commit = {
//     "x-amz-content-sha256": sha256,
//     "x-amz-date": amzdate,
//     "x-amz-security-token": session_token
//   };
//   const signature = AWSsignature(access_key, secret_key, request_parameters_commit, headers_commit, "POST", payload);
//   const authorization = `AWS4-HMAC-SHA256 Credential=${access_key}/${datestamp}/ap-singapore-1/vod/aws4_request, SignedHeaders=x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=${signature}`;

//   headers_commit['authorization'] = authorization;
//   headers_commit['Content-Type'] = 'text/plain;charset=UTF-8';

//   const commitRes = await axios.post(`${commitUrl}?${request_parameters_commit}`, payload, { headers: headers_commit });
//   if (!assertSuccess(commitUrl, commitRes)) return false;
//   return video_id;
// }