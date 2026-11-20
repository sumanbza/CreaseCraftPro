import { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

const MAX_RETRIES = 4;

/**
 * Subscribes to a list of Firestore queries / document refs and returns the
 * results merged per collection name, de-duplicated by document id.
 *
 * specs: [{ key: unique string, collection: 'memberships', ref: Query | DocumentReference, isDoc?: boolean }]
 * Listeners are re-created only when the set of keys changes, so callers must
 * encode everything that changes the query (club id, user id, ...) in `key`.
 *
 * Documents created locally that the server has not confirmed yet carry
 * `_unconfirmed: true` (later edits to an already-confirmed document don't). A listener rejected with permission-denied is retried
 * a few times with backoff, because access can depend on a membership write
 * that the server is still committing.
 */
export function useLiveQueries(specs) {
  const [results, setResults] = useState({});
  const signature = specs.map(s => s.key).join('|');

  useEffect(() => {
    let cancelled = false;
    const active = new Map(); // key -> unsubscribe
    const timers = [];

    const confirmed = new Set(); // ids the server has confirmed at least once

    const subscribe = ({ key, ref, isDoc }, attempt = 0) => {
      const unsubscribe = onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (snap) => {
          const toItem = (d) => {
            if (!d.metadata.hasPendingWrites) confirmed.add(d.ref.path);
            return confirmed.has(d.ref.path)
              ? { id: d.id, ...d.data() }
              : { id: d.id, ...d.data(), _unconfirmed: true };
          };
          const docs = isDoc
            ? (snap.exists() ? [toItem(snap)] : [])
            : snap.docs.map(toItem);
          setResults(prev => ({ ...prev, [key]: docs }));
        },
        (err) => {
          if (cancelled) return;
          if (err.code === 'permission-denied' && attempt < MAX_RETRIES) {
            timers.push(setTimeout(() => {
              if (!cancelled) subscribe({ key, ref, isDoc }, attempt + 1);
            }, 500 * 2 ** attempt));
            return;
          }
          console.error(`Firestore listener "${key}" failed:`, err);
          setResults(prev => ({ ...prev, [key]: [] }));
        }
      );
      active.set(key, unsubscribe);
    };

    specs.forEach(spec => subscribe(spec));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      active.forEach(unsubscribe => unsubscribe());
    };
    // `signature` captures every input that changes the listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return useMemo(() => {
    const byCollection = {};
    for (const { key, collection } of specs) {
      const bucket = (byCollection[collection] ||= new Map());
      for (const d of results[key] || []) bucket.set(d.id, d);
    }
    const out = {};
    for (const [name, map] of Object.entries(byCollection)) out[name] = [...map.values()];
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, signature]);
}
