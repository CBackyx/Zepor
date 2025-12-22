import { Controller, Post, Body, Get } from '@nestjs/common';
import { ProofsService } from './proofs.service';
import { Proof } from './proof.entity';

@Controller('proofs')
export class ProofsController {
    constructor(private readonly proofsService: ProofsService) { }

    @Post('generate')
    async generate(@Body() body: { userId: number; pdfHash: string }): Promise<Proof> {
        return this.proofsService.generateProof(body.userId, body.pdfHash);
    }

    @Get()
    async findAll(): Promise<Proof[]> {
        return this.proofsService.findAll();
    }

    @Get('public')
    async findPublic(): Promise<Proof[]> {
        return this.proofsService.findPublic();
    }
}
