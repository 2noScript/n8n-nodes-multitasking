


export type stepErrorMessage = {
   step:number,
   info: string,
}


class VideoException{
    captureUploadStep(message:stepErrorMessage, info:string){
        throw {
            message,
            info,
        }
    }
    
}

export const videoException = new VideoException();
