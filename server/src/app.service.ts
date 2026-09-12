import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      message: 'Server is running',
    };
  }

  getHealth() {
    return {
      status: 'ok',
    };
  }
}
