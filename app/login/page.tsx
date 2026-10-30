import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-wrap">
      <form className="login-card" action={login}>
        <div className="eyebrow">WEBAPP PERSONALE</div>
        <h1>ASTARTE</h1>
        <p className="muted">1% better, everyday</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>

        <button className="btn btn-primary btn-block" type="submit">
          Accedi
        </button>

        {params.error && <div className="error">{params.error}</div>}
      </form>
    </main>
  );
}
