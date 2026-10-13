# SongChanger

SongChanger is a Vencord user plugin for choosing separate audio files for incoming call rings and message or mention notifications. Each sound is optional; when no custom file is selected, Discord's original sound continues to play.

## Features

- Select a local audio file for incoming calls.
- Select a different local audio file for message and mention notifications.
- See the selected file name in plugin settings.
- Restore either category to Discord's default independently.
- Persist selected files locally in Vencord's IndexedDB-backed data store, so the files do not need to stay in their original folder.
- Restore Discord's original audio sources and release temporary playback URLs when the plugin is stopped.

The plugin intercepts Discord's `WebAudioSound.ensureAudio` method and changes the source only for call-ring, message, and mention sounds. Other Discord sounds are not intentionally changed. Files are selected through the system/browser audio-file picker (`audio/*`).

## Install

1. Download `SongChanger.tsx` from this repository.
2. Copy it into Vencord's `src/userplugins` directory. Create that directory if it does not already exist.
3. Build Vencord using its normal build instructions.
4. Enable **SongChanger** in Discord's Vencord Plugins settings.
5. Open SongChanger's settings and choose a call sound, a notification sound, or both.

Use **Use default** beside a selected sound to remove just that custom file and return that sound category to Discord's default. Disabling or stopping the plugin also restores original sources for active audio elements.

## Development

This repository contains a Vencord user-plugin source file, not a standalone Discord mod. Vencord provides the `@api`, `@utils`, and `@webpack` imports when the plugin is built from `src/userplugins`; the plugin cannot run by itself.

To test changes, place `SongChanger.tsx` in Vencord's `src/userplugins` directory and run the project's lint, TypeScript, and build checks. Remove the copied file after testing if you do not want it in that Vencord checkout.

## License

GPL-3.0-or-later. The plugin uses Vencord APIs and follows the licensing header in its source file.
