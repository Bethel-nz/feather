# Feather Rooms — Demo App

Collaborative music player that consumes the Feather flag service over HTTP.

Six feature flags gated via `FeatureFlagProvider`:

- `collaborative-queue` — shared queue sidebar
- `reactions` — reaction pills on tracks
- `lyrics-sync` — scrolling lyrics overlay
- `listening-history` — recently played panel
- `visualizer` — animated frequency bars
- `ambient-mode` — subtle animated background

## Develop

```bash
bun dev
```

Edit flags in the admin dashboard (localhost:3000) and watch them take effect in real-time — polls `/features?context_key=...` every 3s.

## SDK

The SDK lives in `feature-flags/` — a local module, not an external package. Exports `FeatureFlagProvider` and `useFeatureFlag`.
