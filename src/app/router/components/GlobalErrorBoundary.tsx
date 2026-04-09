import { useRouteError, isRouteErrorResponse } from "react-router";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export function GlobalErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    // Check if error is a dynamic import error (chunk loading failed)
    if (
      error instanceof Error &&
      (error.message.includes("Failed to fetch dynamically imported module") ||
        error.message.includes("Importing a module script failed"))
    ) {
      // Force reload the page to get the latest chunk mapping
      window.location.reload();
    }
  }, [error]);

  let errorMessage = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data;
  } else if (error instanceof Error) {
    if (
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed")
    ) {
      errorMessage = "A new version of the application is available. Reloading...";
    } else {
      errorMessage = error.message;
    }
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h1 className="text-xl font-semibold">Oops! Something went wrong.</h1>
        <p className="text-sm opacity-80">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
