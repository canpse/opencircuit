export type LocalAutosaveStatus = 'saving' | 'saved' | 'failed' | 'recovered';

export type LocalAutosaveModel = {
  status: LocalAutosaveStatus;
  recovering: boolean;
};

export type LocalAutosaveEvent = { type: 'started' } | { type: 'succeeded' } | { type: 'failed' };

export const INITIAL_LOCAL_AUTOSAVE_MODEL: LocalAutosaveModel = {
  status: 'saving',
  recovering: false,
};

export function localAutosaveReducer(
  current: LocalAutosaveModel,
  event: LocalAutosaveEvent,
): LocalAutosaveModel {
  if (event.type === 'started') {
    return {
      status: 'saving',
      recovering: current.status === 'failed',
    };
  }
  if (event.type === 'failed') {
    return {
      status: 'failed',
      recovering: false,
    };
  }
  return {
    status: current.recovering ? 'recovered' : 'saved',
    recovering: false,
  };
}
