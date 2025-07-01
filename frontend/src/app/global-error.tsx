'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <h2 className="text-2xl font-semibold mb-4">Something went wrong!</h2>
          <p className="text-gray-600 mb-6">
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}