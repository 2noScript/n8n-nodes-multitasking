import { IBinaryData, IExecuteFunctions } from "n8n-workflow";


class VideoHandler{


    async uploadVideo(exc: IExecuteFunctions, title: string, tags: string, binaryData?: IBinaryData){
        const tiktokApi = await exc.getCredentials('tiktokApi');

        // const a= exc.helpers.request({
        //     method: 'GET',
        //     url: 'https://example.com',
           
        // });
        return tiktokApi;

    }
}


export const reelHandler=new VideoHandler()
