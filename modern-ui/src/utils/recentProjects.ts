/**
 * Commesse aperte di recente.
 *
 * Il database non registra quando una commessa e' stata toccata l'ultima
 * volta, e aggiungere una colonna per questo sarebbe sproporzionato: quello
 * che serve davvero e' "riprendi da dove eri", che riguarda questa
 * postazione e non l'archivio. Quindi vive nel browser.
 */

const KEY = 'recent_projects';
const MAX = 5;

/** Gli id delle ultime commesse aperte, dalla piu' recente. */
export const getRecentProjects = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    // Voce corrotta o storage non disponibile: meglio un elenco vuoto che
    // una dashboard che non si apre.
    return [];
  }
};

/** Segna una commessa come appena aperta, in testa e senza duplicati. */
export const rememberProject = (id: number | string): void => {
  if (id === null || id === undefined) return;
  try {
    const next = [String(id), ...getRecentProjects().filter(x => x !== String(id))].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Se lo storage e' pieno o bloccato, l'elenco semplicemente non si aggiorna.
  }
};
