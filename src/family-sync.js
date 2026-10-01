// Reconcile server snapshots while retaining this device's local actor position.
export function mergeFamilySnapshot(current, incoming) {
  // Polls, visibility refreshes and action responses can arrive out of order.
  // Equal revisions carry no new shared progress and should not repaint the town.
  if (current && incoming.revision <= current.revision) return current;
  return { ...incoming, state: { ...incoming.state, boy: current?.state.boy || incoming.state.boy } };
}
