Overlay contents:
 - assets/js/narration.js (filled; shared controller)
 - data/rooms/narration.json (voice profile + per-room map)
 - data/rooms/room001_talktrack.txt (talk track script)
 - data/rooms/room001.html updated to include narration controls + narration.js

To add real narration audio later:
 - put MP3 at assets/audio/room001_talktrack.mp3
 - the app will auto-detect and play it; otherwise TTS fallback uses the transcript.
