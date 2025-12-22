'use client';

import { useState, useEffect } from 'react';

export default function VerifierPortal() {
    const [proofs, setProofs] = useState<any[]>([]);

    useEffect(() => {
        fetchProofs();
        const interval = setInterval(fetchProofs, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchProofs = async () => {
        try {
            // Fetch public proofs
            // Note: My backend implementation of `findPublic` filters by `isPublic: true`.
            // The Mock ZKP callback sets `isPublic: true` upon verification.
            const res = await fetch('http://localhost:3000/proofs/public');
            if (res.ok) {
                const data = await res.json();
                setProofs(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-teal-600">Zepor Verifier Portal</h1>
                <p className="text-gray-500 mt-2">Publicly verifiable Real World Asset reserves</p>
            </header>

            <main className="max-w-5xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <table className="w-full text-left">
                        <thead className="bg-teal-50 text-teal-800 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Proof ID</th>
                                <th className="px-6 py-4">Issuer ID</th>
                                <th className="px-6 py-4">PDF Hash</th>
                                <th className="px-6 py-4">Verification Status</th>
                                <th className="px-6 py-4">Verified At</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {proofs.map((proof) => (
                                <tr key={proof.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-medium">#{proof.id}</td>
                                    <td className="px-6 py-4">Issuer-{proof.issuerId}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{proof.pdfHash}</td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center text-green-600 font-medium">
                                            <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                                            Verified on-chain
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {new Date(proof.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-teal-600 hover:text-teal-800 font-medium text-sm">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {proofs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        No public proofs available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
