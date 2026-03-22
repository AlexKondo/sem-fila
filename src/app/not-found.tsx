import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Página não encontrada</h2>
        <p className="text-gray-500 text-sm mb-6">
          O link pode ter expirado ou o QR Code é inválido.
        </p>
        <Link
          href="/"
          className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-600 transition"
        >
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
