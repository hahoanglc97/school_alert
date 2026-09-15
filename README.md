# School Sound

A small school music scheduling app. A lightweight Node/Express server stores uploaded MP3 files as real files on disk and serves the frontend.

## Run locally

```sh
cd "/Users/edward/Documents/ChatGPT/School alarm"
npm install
npm start
```

Then open `http://localhost:4173`.

### Run with Docker

```sh
cd "/Users/edward/Documents/ChatGPT/School alarm"
docker compose up --build
```

Then open `http://localhost:4173`. Uploaded MP3s and the schedule are bind-mounted to `./music` and `./data` on the host, so they show up as real files/folders next to the project and survive container rebuilds.

## What it does

- Uploads, previews, and deletes MP3 files (15 MB maximum each). Files are saved to the `music/` folder on disk (tracked in `music/manifest.json`), not embedded in browser storage.
- Saves the Monday–Friday schedule and settings on the server in `data/schedule.json`, so they persist across browsers/devices and survive clearing browser data.
- Validates end times and prevents schedule overlap for a given day.
- Starts and stops enabled scheduled audio based on the configured IANA timezone.
- Shows current and next sound, supports manual playback and volume control, and can pause the scheduler.
- Lets each schedule entry use its own song, or (via **Settings → Dùng một bài nhạc cho tất cả lịch phát**) force every schedule to play one shared song — switching the toggle off restores each entry's own choice.

## Playback note

Browsers require a user interaction before sound may start automatically. At the beginning of each browser session, select **Enable music player** (or preview an MP3). The dashboard remains open for scheduled playback.

## Architecture

The UI delegates schedule evaluation to `currentActive()` / `schedulerTick()` and uses `playSchedule()` solely as a playback controller. This keeps schedule management, evaluation, and player control separate. `server.js` owns MP3 storage (`music/` folder + `manifest.json`) behind `/api/music` and the weekly schedule/settings behind `/api/schedule`; the frontend never touches audio bytes or the filesystem directly, so swapping in a database later doesn't require redesigning the UI.

## File storage

- Uploaded MP3s live in `music/<uuid>.mp3` on disk, referenced by `music/manifest.json` (id, original name, filename, URL, upload date).
- The weekly schedule and settings live in `data/schedule.json` (`{ schedules, settings }`), read/written via `GET`/`PUT /api/schedule`.

All of the above are gitignored since they're runtime data specific to each deployment.
