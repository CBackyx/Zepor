'use client';

import { useState, useEffect } from 'react';

export default function IssuerDashboard() {
    const [email, setEmail] = useState('issuer@example.com');
    const [userId, setUserId] = useState<number | null>(null);
    const [proofs, setProofs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Mock Login on Mount (or by button)
    const login = async () => {
        console.log("Attempting login...");
        try {
            const res = await fetch('http://localhost:3000/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, passwordHash: 'secret' }),
            });
            if (!res.ok) {
                throw new Error(`Login failed: ${res.statusText}`);
            }
            const data = await res.json();
            console.log("Login successful:", data);
            setUserId(data.id);
            fetchProofs();
        } catch (e) {
            console.error("Login Error:", e);
            alert("Login failed! Check console for details.");
        }
    };

    const fetchProofs = async () => {
        try {
            const res = await fetch('http://localhost:3000/proofs');
            const data = await res.json();
            // Filter by issuerId locally or backend should support filtering
            // For now backend returns all, we filter if we had multi-user logic
            setProofs(data.filter((p: any) => p.issuerId === userId));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (userId) {
            const interval = setInterval(fetchProofs, 2000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    const handleGenerate = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            await fetch('http://localhost:3000/proofs/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, pdfHash: `hash_${Date.now()}` }),
            });
            fetchProofs();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
            <header className="mb-10 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-blue-600">Zepor Issuer</h1>
                <div className="text-sm text-gray-500">
                    User ID: {userId ? userId : 'Not Logged In'}
                </div>
            </header>

            <main className="max-w-4xl mx-auto">
                {!userId ? (
                    <div className="bg-white p-8 rounded-xl shadow-sm text-center">
                        <h2 className="text-xl mb-4">Welcome Back</h2>
                        <button
                            onClick={login}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Login / Register as {email}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Upload Section */}
                        <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4">Generate Proof of Reserve</h2>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition cursor-pointer">
                                <p className="text-gray-500 mb-4">Drag and drop your Bank Statement PDF here</p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                                >
                                    {loading ? 'Processing...' : 'Upload & Generate Proof'}
                                </button>
                            </div>
                        </section>

                        {/* Proofs List */}
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Your Proofs</h2>
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">ID</th>
                                            <th className="px-6 py-3">PDF Hash</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {proofs.map((proof) => (
                                            <tr key={proof.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">{proof.id}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{proof.pdfHash}</td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${proof.status === 'VERIFIED'
                                                            ? 'bg-green-100 text-green-700'
                                                            : proof.status === 'PENDING'
                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                : 'bg-red-100 text-red-700'
                                                            }`}
                                                    >
                                                        {proof.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-sm">
                                                    {new Date(proof.createdAt).toISOString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {proofs.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                                    No proofs found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
