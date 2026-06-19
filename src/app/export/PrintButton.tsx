"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
    >
      Print / Save as PDF
    </button>
  );
}
