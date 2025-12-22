import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Proof {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    issuerId: number;

    @Column()
    pdfHash: string;

    @Column({ default: 'PENDING' })
    status: string;

    @Column({ type: 'text', nullable: true })
    proofData: string;

    @Column({ default: false })
    isPublic: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
