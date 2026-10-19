'use client';

import { useCallback, useEffect, useRef } from 'react';
import { MAX_PLAYS_PER_SAVE, type Game } from '@/lib/game-plays/model';
import { jsonBody } from '@/lib/request-json';

/** Sends `plays` of `game` without waiting; `keepalive` lets it finish while the page unloads. */
function sendGamePlays(game: Game, plays: number) {
  try {
    void fetch('/api/game-plays', { ...jsonBody('POST', { game, plays }), keepalive: true }).catch(
      () => {},
    );
  } catch {
    // fetch can throw synchronously (e.g. the keepalive quota); counting is best effort.
  }
}

/**
 * Counts the plays of a game popup and saves them when it closes (unmounts). Leaving the page with
 * the popup open (closing the tab, reloading, switching apps on a phone) saves them too, since no
 * close runs then. Returns `count`, called once per play.
 */
export default function useGamePlayCounter(game: Game) {
  const plays = useRef(0);
  const flush = useCallback(() => {
    const count = plays.current;
    plays.current = 0;
    if (count) sendGamePlays(game, count);
  }, [game]);
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [flush]);
  return useCallback(() => {
    plays.current += 1;
    if (plays.current >= MAX_PLAYS_PER_SAVE) flush();
  }, [flush]);
}
