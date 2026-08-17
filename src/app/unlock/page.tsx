export const metadata = { title: "Iceland" };

export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; bad?: string }>;
}) {
  const { next = "/", bad } = await searchParams;
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <form action="/api/unlock" method="POST" className="w-full max-w-xs">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-3)]">
          2–10 October 2026
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Iceland</h1>
        <input type="hidden" name="next" value={next} />
        <input
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          className="mt-5 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-raised)]
                     px-3 py-2.5 text-[15px] outline-none focus:border-[var(--color-accent)]"
        />
        {bad && (
          <p className="mt-2 text-[12.5px] text-[var(--color-bad)]">That is not it. Try again.</p>
        )}
        <button
          type="submit"
          className="mt-3 w-full rounded-md bg-[var(--color-accent)] px-3 py-2.5 font-mono
                     text-[11px] tracking-[0.08em] uppercase text-[var(--color-surface)]"
        >
          Open the guide
        </button>
      </form>
    </div>
  );
}
