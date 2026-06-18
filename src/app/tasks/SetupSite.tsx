import { createSite } from "./actions";

export default function SetupSite() {
  return (
    <main className="min-h-screen flex flex-col justify-center px-6 max-w-md mx-auto">
      <h1 className="font-display text-2xl font-bold">Name your site</h1>
      <p className="mt-2 text-neutral">
        This is the building or home you look after. You can rename it later.
      </p>
      <form action={createSite} className="mt-6 space-y-3">
        <input
          name="name"
          required
          placeholder="e.g. Maple House Care Home"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white"
        >
          Create site
        </button>
      </form>
    </main>
  );
}
