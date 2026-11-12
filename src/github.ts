const ENDPOINT = 'https://api.github.com/graphql';
const USER_AGENT = 'github-cool-readme';

export class GitHubError extends Error {}

interface GraphQLError {
  type?: string;
  message: string;
  path?: (string | number)[];
}

export interface Client {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  /** Messages for parts GitHub refused to return (e.g. SAML-protected organizations). */
  warnings: string[];
  /** The token's scopes, known after the first query; null for tokens without scopes (fine-grained, apps). */
  scopes(): string[] | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createClient(token: string, log: (msg: string) => void = () => {}): Client {
  const warnings: string[] = [];
  let scopes: string[] | null = null;

  async function query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': USER_AGENT,
        },
        body: JSON.stringify({ query, variables }),
      });
      const header = res.headers.get('x-oauth-scopes');
      if (header !== null) scopes = header.split(',').map((s) => s.trim()).filter(Boolean);

      const retryable = res.status >= 500 || res.status === 403 || res.status === 429;
      if (!res.ok && retryable && attempt < 4) {
        const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * attempt;
        log(`GitHub answered ${res.status}, retrying in ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      if (res.status === 401) throw new GitHubError('the token was rejected (401); check that it is valid');
      if (!res.ok) throw new GitHubError(`GitHub answered ${res.status}: ${(await res.text()).slice(0, 300)}`);

      const body = (await res.json()) as { data?: T; errors?: GraphQLError[] };
      if (body.errors?.length) {
        // These come with partial data (e.g. a SAML-protected org, a deleted repo): the rest is usable.
        const fatal = body.errors.filter((e) => e.type !== 'FORBIDDEN' && e.type !== 'NOT_FOUND');
        if (fatal.length || !body.data) {
          throw new GitHubError(body.errors.map((e) => e.message).join('; '));
        }
        for (const e of body.errors) {
          const msg = `${e.message}${e.path ? ` (at ${e.path.join('.')})` : ''}`;
          if (!warnings.includes(msg)) warnings.push(msg);
        }
      }
      return body.data as T;
    }
  }

  return { query, warnings, scopes: () => scopes };
}

export async function fetchDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/png';
    const data = Buffer.from(await res.arrayBuffer()).toString('base64');
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}
