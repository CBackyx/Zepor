import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proof } from './proof.entity';

@Injectable()
export class ProofsService {
    constructor(
        @InjectRepository(Proof)
        private proofsRepository: Repository<Proof>,
    ) { }

    async generateProof(userId: number, pdfHash: string): Promise<Proof> {
        const proof = this.proofsRepository.create({
            issuerId: userId,
            pdfHash,
            status: 'PENDING',
            isPublic: false,
        });
        const savedProof = await this.proofsRepository.save(proof);

        // Call Mock Server Asynchronously
        this.callZkpMock(savedProof.id, pdfHash);

        return savedProof;
    }

    async findAll(): Promise<Proof[]> {
        return this.proofsRepository.find();
    }

    async findPublic(): Promise<Proof[]> {
        return this.proofsRepository.findBy({ isPublic: true });
    }

    private async callZkpMock(proofId: number, pdfHash: string) {
        try {
            console.log(`Calling ZKP Mock for proof ${proofId}...`);
            const response = await fetch('http://localhost:4000/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proof_id: proofId, pdf_hash: pdfHash }),
            });

            if (response.ok) {
                const data = await response.json();
                // Update DB
                await this.proofsRepository.update(proofId, {
                    status: 'VERIFIED',
                    proofData: JSON.stringify(data),
                    isPublic: true, // Auto publish for testing
                });
                console.log(`Proof ${proofId} verified.`);
            } else {
                console.error('ZKP Mock Validation Failed');
                await this.proofsRepository.update(proofId, { status: 'FAILED' });
            }
        } catch (error) {
            console.error('ZKP Mock Connection Failed', error);
            await this.proofsRepository.update(proofId, { status: 'FAILED' });
        }
    }
}
