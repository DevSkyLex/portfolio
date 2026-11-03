import {
  type InputSignal,
  type Signal,
  type WritableSignal,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import {
  type LoginStep,
  LoginFlowStore,
  type LoginFlowStoreType,
} from '@vfortin/identity-web-data-access';
import type { LoginScreen } from '@internal/identity-web-feature/lib/models/login-screen/login-screen.type';
import { CredentialsFormComponent } from '@internal/identity-web-feature/lib/ui/forms/credentials-form/credentials-form.component';
import type { CredentialsFormValues } from '@internal/identity-web-feature/lib/ui/forms/credentials-form/models/credentials-form-values.model';
import { LoginCodeFormComponent } from '@internal/identity-web-feature/lib/ui/forms/login-code-form/login-code-form.component';
import type { LoginCodeFormValues } from '@internal/identity-web-feature/lib/ui/forms/login-code-form/models/login-code-form-values.model';

/**
 * Component LoginPageComponent
 * @class LoginPageComponent
 *
 * @description
 * Two-screen login of the sole administrator (D17, D36): e-mail and password first, then the
 * one-time code unless this browser is a trusted device; navigates to a safe admin destination.
 */
@Component({
  selector: 'identity-login-page',
  imports: [CredentialsFormComponent, LoginCodeFormComponent, NgIcon, RouterLink],
  providers: [LoginFlowStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block bg-void' },
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  // #region Properties
  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icon of the back links.
   */
  protected readonly icons: { readonly back: typeof lucideArrowLeft } = {
    back: lucideArrowLeft,
  } as const;

  /**
   * Property redirect
   * @readonly
   *
   * @description
   * Optional destination requested before authentication; the page forwards values beginning with
   * `/admin` and otherwise returns to the admin root.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly redirect: InputSignal<string | undefined> = input<string>();

  /**
   * Property session
   * @readonly
   *
   * @description
   * Page-scoped request store used to submit credentials and the code and expose named call states.
   *
   * @type {LoginFlowStoreType}
   */
  private readonly session: LoginFlowStoreType = inject<LoginFlowStoreType>(LoginFlowStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to navigate to the requested admin destination after successful authentication.
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property codeForm
   * @readonly
   *
   * @description
   * Form of the second screen, absent on the first one; emptied after a wrong code.
   */
  private readonly codeForm: Signal<LoginCodeFormComponent | undefined> =
    viewChild<LoginCodeFormComponent>(LoginCodeFormComponent);

  /**
   * Property step
   * @readonly
   *
   * @description
   * Screen on display.
   *
   * @type {WritableSignal<LoginScreen>}
   */
  protected readonly step: WritableSignal<LoginScreen> = signal<LoginScreen>('credentials');

  /**
   * Property challenge
   * @readonly
   *
   * @description
   * Single-use challenge returned by the first step and sent back with the code.
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly challenge: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property credentials
   * @readonly
   *
   * @description
   * E-mail and "Se souvenir de moi" of the accepted first step, without the password: named on the
   * code screen and restored when the administrator goes back.
   *
   * @type {WritableSignal<CredentialsFormValues | null>}
   */
  protected readonly credentials: WritableSignal<CredentialsFormValues | null> =
    signal<CredentialsFormValues | null>(null);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a step is awaiting the identity service.
   *
   * @type {Signal<boolean>}
   */
  protected readonly pending: Signal<boolean> = this.session.pending;

  /**
   * Property failure
   * @readonly
   *
   * @description
   * French rejection shown above the current form, or `null` when there is none.
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly failure: WritableSignal<string | null> = signal<string | null>(null);
  // #endregion

  // #region Methods
  /**
   * Method signIn
   * @method signIn
   *
   * @description
   * First step: sends the credentials; opens the admin on a trusted device, otherwise shows the code
   * screen.
   *
   * @param {CredentialsFormValues} values - Valid values of the credentials form.
   *
   * @returns {Promise<void>} Resolves after the request and any navigation.
   */
  protected async signIn(values: CredentialsFormValues): Promise<void> {
    if (this.pending()) {
      return;
    }
    const ticket: number = this.session.captureIntent();
    const outcome: LoginStep = await this.session.login(values);
    if (!this.session.isCurrentIntent(ticket)) return;
    if (outcome.kind === 'failed') {
      this.failure.set(
        outcome.error.status === 401 ? 'Adresse ou mot de passe incorrect.' : outcome.error.message,
      );
      return;
    }
    this.failure.set(null);
    if (outcome.kind === 'authenticated') {
      await this.enter();
      return;
    }
    this.credentials.set({ ...values, password: '' });
    this.challenge.set(outcome.challenge);
    this.step.set('code');
  }

  /**
   * Method verify
   * @method verify
   *
   * @description
   * Second step. A wrong code empties the field; an expired challenge sends the administrator back to
   * the first screen.
   *
   * @param {LoginCodeFormValues} values - Valid values of the code form.
   *
   * @returns {Promise<void>} Resolves after the request and any navigation.
   */
  protected async verify(values: LoginCodeFormValues): Promise<void> {
    const challenge: string | null = this.challenge();
    if (challenge === null || this.pending()) {
      return;
    }
    const ticket: number = this.session.captureIntent();
    const error: Awaited<ReturnType<LoginFlowStoreType['verifyCode']>> =
      await this.session.verifyCode({ challenge, ...values });
    if (!this.session.isCurrentIntent(ticket)) return;
    if (error === null) {
      await this.enter();
      return;
    }
    // IDENTITY_ERROR_CODES.challengeExpired: the browser imports no value from the contracts (D10).
    if (error.code === 'identity.challenge-expired') {
      this.back();
      this.failure.set('La vérification a expiré. Reconnectez-vous.');
      return;
    }
    this.failure.set(error.status === 401 ? 'Code incorrect. Réessayez.' : error.message);
    this.codeForm()?.clear();
  }

  /**
   * Method back
   * @method back
   *
   * @description
   * Returns to the first screen, keeping the e-mail and forgetting the challenge.
   */
  protected back(): void {
    this.session.cancel();
    this.challenge.set(null);
    this.failure.set(null);
    this.step.set('credentials');
  }

  /**
   * Method enter
   * @method enter
   *
   * @description
   * Opens the requested admin page, or the admin root when the request points elsewhere.
   *
   * @returns {Promise<void>} Resolves after the navigation.
   */
  private async enter(): Promise<void> {
    const redirect: string | undefined = this.redirect();
    await this.router.navigateByUrl(redirect?.startsWith('/admin') ? redirect : '/admin');
  }
  // #endregion
}
