import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proof } from './proof.entity';
import { ProofsService } from './proofs.service';
import { ProofsController } from './proofs.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Proof])],
    providers: [ProofsService],
    controllers: [ProofsController],
})
export class ProofsModule { }
