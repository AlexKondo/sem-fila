'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado</h2>
        <p className="text-gray-500 text-sm mb-6">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-600 transition"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
