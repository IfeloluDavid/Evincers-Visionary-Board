import type { Store } from '../src/store.js';
import type { Step, Vision } from '../src/types.js';

export function createMemoryStore(): Store {
  const visions = new Map<string, Vision>(); // `${userId}|${id}`
  const steps = new Map<string, Step>(); // `${userId}|${visionId}|${id}`

  return {
    async listVisions(userId) {
      return [...visions.values()].filter((v) => v.userId === userId).sort((a, b) => a.id.localeCompare(b.id));
    },
    async getVision(userId, id) {
      return visions.get(`${userId}|${id}`) ?? null;
    },
    async putVision(v) {
      visions.set(`${v.userId}|${v.id}`, structuredClone(v));
    },
    async deleteVision(userId, id) {
      for (const k of [...steps.keys()]) if (k.startsWith(`${userId}|${id}|`)) steps.delete(k);
      visions.delete(`${userId}|${id}`);
    },
    async listSteps(userId, visionId) {
      return [...steps.values()].filter((s) => s.userId === userId && s.visionId === visionId);
    },
    async listAllSteps(userId) {
      return [...steps.values()].filter((s) => s.userId === userId);
    },
    async getStep(userId, visionId, id) {
      return steps.get(`${userId}|${visionId}|${id}`) ?? null;
    },
    async putStep(s) {
      steps.set(`${s.userId}|${s.visionId}|${s.id}`, structuredClone(s));
    },
    async deleteStep(userId, visionId, id) {
      steps.delete(`${userId}|${visionId}|${id}`);
    },
    async listShared(limit) {
      return [...visions.values()]
        .filter((v) => v.visibility === 'church')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit);
    },
  };
}
