import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { UsersService } from '../services/users.service';


@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }


  /** ✅ Lister les utilisateurs, tri et pagination */
  @UseGuards(FirebaseAuthGuard)
  @Get()
  async getUsers() {
    try {
      const users = await this.usersService.listAllUsers();
      return { status: 200, data: users };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}
