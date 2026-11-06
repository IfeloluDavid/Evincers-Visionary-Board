import { getIdToken, signOut } from './auth';
import { config } from './config';
import type { PublicVision, Step, StepInput, UpcomingStep, Vision, VisionInput } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getIdToken();
  if (!token) throw new ApiError('Your session has expired. Please sign in again.', 401);

  let res: Response;
  try {
    res = await fetch(config().apiUrl + path, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  if (res.status === 401) {
    signOut();
    window.location.assign('/login');
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data;
}

export const api = {
  listVisions: () => request<{ visions: Vision[] }>('GET', '/visions').then((r) => r.visions),
  createVision: (input: VisionInput) => request<{ vision: Vision }>('POST', '/visions', input).then((r) => r.vision),
  getVision: (id: string) => request<{ vision: Vision; steps: Step[] }>('GET', `/visions/${id}`),
  updateVision: (id: string, input: VisionInput) =>
    request<{ vision: Vision }>('PATCH', `/visions/${id}`, input).then((r) => r.vision),
  deleteVision: (id: string) => request<void>('DELETE', `/visions/${id}`),

  addStep: (visionId: string, input: StepInput) =>
    request<{ step: Step; vision: Vision }>('POST', `/visions/${visionId}/steps`, input),
  updateStep: (visionId: string, stepId: string, input: StepInput) =>
    request<{ step: Step; vision: Vision }>('PATCH', `/visions/${visionId}/steps/${stepId}`, input),
  deleteStep: (visionId: string, stepId: string) =>
    request<{ vision: Vision }>('DELETE', `/visions/${visionId}/steps/${stepId}`),

  upcoming: () => request<{ steps: UpcomingStep[] }>('GET', '/steps/upcoming').then((r) => r.steps),
  community: () => request<{ visions: PublicVision[] }>('GET', '/community').then((r) => r.visions),
};
