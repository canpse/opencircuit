import type { ProfilerOnRenderCallback } from 'react';
import { addProfileSample, PROFILE_ENABLED } from './measure';

export { beginProfileInteraction, commitProfileInteractions, measureProfile } from './measure';
export type { ProfileDetails, ProfileSample } from './measure';

export const recordReactProfile: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
) => {
  if (!PROFILE_ENABLED) return;
  addProfileSample(`react.${id}`, actualDuration, { phase, baseDuration });
};
