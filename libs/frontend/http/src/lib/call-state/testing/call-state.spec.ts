import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
} from '@internal/web-http/lib/call-state/call-state';

describe('CallState', () => {
  it('describes each step of a call, the error only on failure', () => {
    const error: {
      status: number;
      code: null;
      message: string;
      fieldErrors: never[];
      retryable: boolean;
    } = { status: 500, code: null, message: 'Erreur', fieldErrors: [], retryable: true };
    expect(idleCallState()).toEqual({ status: 'idle', error: null });
    expect(pendingCallState()).toEqual({ status: 'pending', error: null });
    expect(successCallState()).toEqual({ status: 'success', error: null });
    expect(errorCallState(error)).toEqual({ status: 'error', error });
  });
});
