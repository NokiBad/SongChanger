# SongChanger

SongChanger is a Vencord user plugin that lets you choose different local audio files for incoming call rings and message/mention notifications. If either choice is unset, Discord's original sound is used.

## Install

1. Download `SongChanger.tsx` from this repository.
2. Place it in Vencord's `src/userplugins` directory.
3. Rebuild Vencord and enable **SongChanger** in the Plugins settings.
4. Open the plugin settings to select a call sound and a notification sound.

The selected audio files are stored locally in Vencord's IndexedDB data store. Use **Use default** to remove a custom sound.

## Development

This repository contains a Vencord user plugin source file. Its imports are provided by Vencord when the file is built from `src/userplugins`.

The plugin is licensed under GPL-3.0-or-later.
