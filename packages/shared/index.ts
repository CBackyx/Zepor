export interface User {
    id: number;
    email: string;
    role: 'ISSUER' | 'VERIFIER' | 'ADMIN';
    kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface Proof {
    id: number;
    issuerId: number;
    pdfHash: string;
    status: 'PENDING' | 'VERIFIED' | 'FAILED';
    proofData?: string;
    isPublic: boolean;
    createdAt: Date;
}
