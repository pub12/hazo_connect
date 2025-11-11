// page.tsx renders the default documentation stub for the hazo_connect landing route.
import React from "react";

// HomePage introduces the component library workspace with a neutral placeholder.
export default function HomePage() {
  return (
    <main className="cls_home_page flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <div className="cls_home_container mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">
          hazo_connect component workspace
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Start adding shared UI components inside the src/components directory to
          prepare them for Storybook previews and downstream integration.
        </p>
      </div>
    </main>
  );
}

