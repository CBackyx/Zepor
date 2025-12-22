export default function AdminConsole() {
    return (
        <div className="min-h-screen bg-neutral-900 text-white p-8 font-sans">
            <header className="mb-10">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Zepor Admin
                </h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                    <h2 className="text-xl font-semibold mb-4">Circuit Management</h2>
                    <p className="text-gray-400 mb-4">Upload and manage ZK circuits and verification keys.</p>
                    <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm transition">
                        Manage Circuits
                    </button>
                </div>

                <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                    <h2 className="text-xl font-semibold mb-4">Auditor Registry</h2>
                    <p className="text-gray-400 mb-4">Whitelist trusted auditors and their public keys.</p>
                    <button className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded text-sm transition">
                        Manage Auditors
                    </button>
                </div>
            </div>
        </div>
    );
}
