import type { SiteBuildDispatcher } from '@vfortin/content-application';

/**
 * Interface GithubDispatchOptions
 * @interface GithubDispatchOptions
 *
 * @description
 * Repository, workflow, ref and credential required to trigger the GitHub Actions build.
 */
export interface GithubDispatchOptions {
  // #region Properties
  /**
   * Property repository
   * @readonly
   *
   * @description
   * GitHub repository in `owner/name` form.
   */
  readonly repository: string;

  /**
   * Property workflow
   * @readonly
   *
   * @description
   * Workflow filename configured to accept `workflow_dispatch` requests.
   */
  readonly workflow: string;

  /**
   * Property ref
   * @readonly
   *
   * @description
   * Branch or tag ref passed as the workflow dispatch target.
   */
  readonly ref: string;

  /**
   * Property token
   * @readonly
   *
   * @description
   * Fine-grained token scoped to Actions write access for this repository.
   */
  readonly token: string;
  // #endregion
}

/**
 * Class GithubSiteBuildDispatcher
 * @class GithubSiteBuildDispatcher
 *
 * @description
 * Calls the GitHub Actions workflow dispatch endpoint to start a build for a content revision.
 */
export class GithubSiteBuildDispatcher implements SiteBuildDispatcher {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores dispatch credentials and the HTTP implementation used for the request.
   *
   * @param {GithubDispatchOptions} options - GitHub repository and workflow credentials.
   * @param {typeof fetch} fetcher - HTTP fetch implementation; defaults to the global fetch.
   */
  public constructor(
    private readonly options: GithubDispatchOptions,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  // #endregion

  // #region Methods
  /**
   * Method dispatch
   * @method dispatch
   *
   * @description
   * Posts the revision to GitHub and rejects if the endpoint returns a non-success response.
   *
   * @param {number} revision - Published-content revision sent as a workflow input.
   * @returns {Promise<void>} Completion when GitHub accepts the workflow trigger.
   */
  public async dispatch(revision: number): Promise<void> {
    const { repository, workflow, ref, token } = this.options;
    const response: Response = await this.fetcher(
      `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/dispatches`,
      {
        method: 'POST',
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'x-github-api-version': '2022-11-28',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ref, inputs: { revision: String(revision) } }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      throw new Error(`GitHub refused the rebuild (HTTP ${response.status}).`);
    }
  }
  // #endregion
}

/**
 * Class LogSiteBuildDispatcher
 * @class LogSiteBuildDispatcher
 *
 * @description
 * Development adapter that reports rebuild requests to a logger without starting a workflow.
 */
export class LogSiteBuildDispatcher implements SiteBuildDispatcher {
  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Stores the callback used to record each development request.
   *
   * @param {(line: string) => void} log - Logger callback.
   */
  public constructor(private readonly log: (line: string) => void) {}
  // #endregion

  // #region Methods
  /**
   * Method dispatch
   * @method dispatch
   *
   * @description
   * Logs the requested revision and deliberately performs no network operation.
   *
   * @param {number} revision - Published-content revision requested for rebuild.
   * @returns {Promise<void>} Completion after the request has been logged.
   */
  public async dispatch(revision: number): Promise<void> {
    this.log(`Site rebuild requested (revision ${revision}) — not triggered in development.`);
  }
  // #endregion
}
