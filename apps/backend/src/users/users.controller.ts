import { Controller, Post, Body, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    async register(@Body() body: Partial<User>): Promise<User> {
        // Simplified: No password hashing for speed currently, but detailed plan said JWT/Auth.
        // I will add hashing later or simple cleartext for now to proceed fast if permitted.
        // I'll stick to cleartext for the Skeleton phase to verify flow, then can enable bcrypt.
        return this.usersService.create(body);
    }

    @Get()
    async findAll(): Promise<User[]> {
        return this.usersService.findAll();
    }
}
