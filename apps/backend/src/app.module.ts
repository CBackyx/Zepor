import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { Proof } from './proofs/proof.entity';
import { UsersModule } from './users/users.module';
import { ProofsModule } from './proofs/proofs.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'zepor',
      password: 'zepor_pass',
      database: 'zepor_db',
      entities: [User, Proof],
      synchronize: true,
    }),
    UsersModule,
    ProofsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
