import { Injectable, Req, Res } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class AppService {
  AWS_S3_BUCKET = 'legal-templates';
  s3 = new AWS.S3({
    accessKeyId: 'AKIA52GGMNSPE7476TU7',
    secretAccessKey: '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',
    signatureVersion: 'v4'
  });

  async doesFolderExist(folder: string): Promise<boolean> {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: `${folder}`, 
    };
    try {
     const tt =  await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false; 
      } else {
        console.error('Error checking folder existence in S3:', error);
        throw new Error('Error checking folder existence in S3');
      }
    }
  }

  async createFolder(folder: string): Promise<void> {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: `${folder}/`, 
      Body: '',
    };

    try {
      await this.s3.upload(params).promise();
    } catch (error) {
      console.error('Error creating folder in S3:', error.message);
      throw new Error('Error creating folder in S3');
    }
  }


  async uploadFile(file, folder: string) {
    const { originalname } = file;

    if (!(await this.doesFolderExist(folder))) {
      await this.createFolder(folder);
    }
    const metadata = {
      imageName: file.originalname,
    };


    return await this.s3_upload(
      file.buffer,
      this.AWS_S3_BUCKET,
      `${folder}/${originalname}`, 
      file.mimetype,
      metadata
    );
  }

  async s3_upload(file, bucket, name, mimetype, metadata) {
    const params = {
      Bucket: bucket,
      Key: String(name),
      Body: file,
      ContentType: mimetype,
      ContentDisposition: 'inline',
      Metadata: metadata, 
      CreateBucketConfiguration: {
        LocationConstraint: 'us-east-1',
      },
    };

    try {
      let s3Response = await this.s3.upload(params).promise();
      return s3Response;
    } catch (e) {
      console.log(e);
    }
  }

  async getImageUrl(key: string): Promise<string> {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: key,
    };

    try {
      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (e) {
      console.log(e);
      throw new Error('Error getting image from S3');
    }
  }

  // async getAllImages(): Promise<string[]> {
  //   const params = {
  //     Bucket: this.AWS_S3_BUCKET,
  //   };

  //   try {
  //     const data = await this.s3.listObjectsV2(params).promise();
  //     const imageKeys = data.Contents.map((object) => object.Key);
  //     return imageKeys;
  //   } catch (e) {
  //     console.log(e);
  //     throw new Error('Error listing images in S3');
  //   }
  // }

  // async getAllImagesInFolder(folder?: string): Promise<string[]> {
  //   const params = {
  //     Bucket: this.AWS_S3_BUCKET,
  //     Prefix: folder ? `${folder}/` : '',

  //   };

  //   try {
  //     const data = await this.s3.listObjectsV2(params).promise();
  //     const imageKeys = data.Contents.map((object) => object.Key);
  //     return imageKeys;
  //   } catch (e) {
  //     console.log(e);
  //     throw new Error(`Error listing images in folder '${folder}' in S3`);
  //   }
  // }

  // async getAllImagesInFolder(folder?: string): Promise<{ keys: string[]; urls: string[] }> {
  //   const params = {
  //     Bucket: this.AWS_S3_BUCKET,
  //     Prefix: folder ? `${folder}/` : '',
  //   };

  //   try {
  //     const data = await this.s3.listObjectsV2(params).promise();
  //     const imageKeys = data.Contents.map((object) => object.Key);
  //     const imageUrls = await Promise.all(imageKeys.map((key) => this.getImageUrl(key)));
      
  //     return { keys: imageKeys, urls: imageUrls };
  //   } catch (e) {
  //     console.log(e);
  //     throw new Error(`Error listing images in folder '${folder}' in S3`);
  //   }
  // }

  async getAllImagesInFolder(folder?: string): Promise<{ name: string; url: string }[]> {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Prefix: folder ? `${folder}/` : '',
    };

    try {
      const data = await this.s3.listObjectsV2(params).promise();

      const images: { name: string; url: string }[] = [];

      for (const object of data.Contents) {
        const key = object.Key;
        
        if (!key.endsWith('/')) {
          const imageName = this.getImageNameWithoutExtension(key);
          const url = await this.getImageUrl(key);
          images.push({ name: imageName, url });
        }
      }

      return images;
    } catch (e) {
      console.log(e);
      throw new Error(`Error listing images in folder '${folder}' in S3`);
    }
  }

  getImageNameWithoutExtension(key: string): string {
    const baseName = key.split('/').pop();
    if (baseName) {
      return baseName.split('.').slice(0, -1).join('.');
    }
    return '';
  }

  

  async updateImage(file, key: string): Promise<any> {
    const doesExist = await this.doesImageExist(key);

    if (!doesExist) {
      throw new Error('Image does not exist in S3');
    }

    const metadata = {
      imageName: file.originalname,
    };

    return await this.s3_upload(
      file.buffer,
      this.AWS_S3_BUCKET,
      key, 
      file.mimetype,
      metadata
    );
  }

  async doesImageExist(key: string): Promise<boolean> {
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: key,
    };
    try {
      await this.s3.headObject(params).promise();
      return true; 
    } catch (error) {
      if (error.code === 'NotFound') {
        return false; 
      } else {
        console.error('Error checking image existence in S3:', error.message);
        throw new Error('Error checking image existence in S3');
      }
    }
  }

  async deleteImage(key: string): Promise<void> {
    
    const imageExists = await this.doesImageExist(key);
    if (imageExists) {
      
      const params = {
        Bucket: this.AWS_S3_BUCKET,
        Key: key,
      };

      try {
        await this.s3.deleteObject(params).promise();
        
      } catch (e) {
        console.error(e);
        throw new Error(`Error deleting image '${key}' `);
      }
    } else {
      
      console.log(`Image '${key}' does not exist.`);
      throw new Error(`Image '${key}'  does not exist.`);
    }
  }

}