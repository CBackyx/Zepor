import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    findAll(): Promise<User[]> {
        return this.usersRepository.find();
    }

    findOne(email: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ email });
    }

    async create(user: Partial<User>): Promise<User> {
        if (user.email) {
            const existing = await this.findOne(user.email);
            if (existing) return existing;
        }
        const newUser = this.usersRepository.create(user);
        return this.usersRepository.save(newUser);
    }
}
