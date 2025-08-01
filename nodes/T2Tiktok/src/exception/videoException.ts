


export type stepErrorMessage = {
   step:number,
   info: string,
}


class VideoException{
    captureUploadStep(message:stepErrorMessage, info:any){
        throw {
            message,
            info:JSON.stringify(info),
        }
    }
    
}

export const videoException = new VideoException();
