import { Controller, Get, Param, Post, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Post('upload')
  // @UseInterceptors(FileInterceptor('file'))
  // uploadFile(@UploadedFile() file: Express.Multer.File) {
  //   return this.appService.uploadFile(file);
  // }

  @Post('upload/:folder')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('folder') folder: string,
  ) {
    try {
     
      if (!(await this.appService.doesFolderExist(folder))) {
        await this.appService.createFolder(folder);
      }

      const response = await this.appService.uploadFile(file, folder);

      return {
        message: 'File uploaded successfully.',
        fileKey: response.Key,
        imageUrl: await this.appService.getImageUrl(response.Key),
      };
    } catch (error) {
      console.error('Error uploading file:', error.message);
      return {
        error: 'Failed to upload the file.',
      };
    }
  }

  @Post('update/:key/:folder')
  @UseInterceptors(FileInterceptor('file'))
  async updateImage(
    @UploadedFile() file: Express.Multer.File,
    @Param('folder') folder: string,
    @Param('key') key: string
    
  ) {
    try {
      const doesExist = await this.appService.doesImageExist(`${folder}/${key}`);

      if (!doesExist) {
        return {
          error: 'Image not found.',
        };
      }

      const response = await this.appService.updateImage(file, `${folder}/${key}`);
      return {
        message: 'File updated successfully.',
        fileKey: response.Key,
        imageUrl: await this.appService.getImageUrl(response.Key),
      };
    } catch (error) {
      console.error('Error updating image:', error.message);
      return {
        error: 'Failed to update the image.',
      };
    }
  }



  @Get('image/:key/:folder')
  async getImageUrl(@Param('key') key: string, @Param('folder') folder: string): Promise<{ url: string }> {
    const url = await this.appService.getImageUrl(`${folder}/${key}`);
    return { url };
  }

  // @Get('images')
  // async getAllImages(): Promise<string[]> {
  //   return this.appService.getAllImages();
  // }

  @Get('images/:folder?')
  async getAllImagesInFolder(@Param('folder') folder: string): Promise<{ name: string; url: string; }[]> {
    const result = await this.appService.getAllImagesInFolder(folder);
    return result;
  }

  @Delete('delete/:folder/:key')
  async deleteImage(
    @Param('folder') folder: string,
    @Param('key') key: string,
  ): Promise<{ message: string }> {
    try {
      await this.appService.deleteImage(`${folder}/${key}`);
      return { message: 'Image deleted successfully.' };
    } catch (error) {
      console.error('Error deleting image:', error.message);
      return { message: 'Failed to delete the image.' };
    }
  }
}