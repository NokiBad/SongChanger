/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { del, get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginSettingComponentProps } from "@utils/types";
import { chooseFile } from "@utils/web";
import { findByCodeLazy } from "@webpack";
import { Button, Forms, showToast } from "@webpack/common";

type SoundKind = "call" | "notification";
type SoundFiles = Record<SoundKind, string>;

interface WebAudioSoundInstance {
    name: string;
    ensureAudio(): Promise<HTMLAudioElement>;
}

interface WebAudioSoundConstructor {
    prototype: WebAudioSoundInstance;
}

const WebAudioSound: WebAudioSoundConstructor = findByCodeLazy("could not play audio:");
const DATA_STORE_KEYS: Record<SoundKind, string> = {
    call: "SongChanger_call",
    notification: "SongChanger_notification"
};
const DEFAULT_SOUND_FILES: SoundFiles = {
    call: "",
    notification: ""
};
const logger = new Logger("SongChanger");

const audioFileCache = new Map<SoundKind, Promise<Blob | undefined>>();
const audioUrlCache = new Map<SoundKind, { blob: Blob; url: string; }>();
const createdAudioUrls = new Set<string>();
const originalAudioSources = new Map<HTMLAudioElement, string>();

function invalidateAudioCache(kind: SoundKind) {
    audioFileCache.delete(kind);
    audioUrlCache.delete(kind);
}

const settings = definePluginSettings({
    customSounds: {
        type: OptionType.COMPONENT,
        default: DEFAULT_SOUND_FILES,
        component: SoundSettings
    }
});

function SoundSettings({ setValue }: PluginSettingComponentProps) {
    const { customSounds } = settings.use(["customSounds"]);
    const soundFiles = customSounds ?? DEFAULT_SOUND_FILES;

    async function chooseSound(kind: SoundKind) {
        try {
            const file = await chooseFile("audio/*");
            if (!file) return;
            if (!file.type.startsWith("audio/")) {
                showToast("Please choose an audio file.", "failure");
                return;
            }

            await set(DATA_STORE_KEYS[kind], file);
            invalidateAudioCache(kind);
            setValue({ ...soundFiles, [kind]: file.name });
        } catch (error) {
            logger.error(`Failed to save the custom ${kind} sound`, error);
            showToast(`Failed to save the custom ${kind} sound.`, "failure");
        }
    }

    async function clearSound(kind: SoundKind) {
        try {
            await del(DATA_STORE_KEYS[kind]);
            invalidateAudioCache(kind);
            setValue({ ...soundFiles, [kind]: "" });
        } catch (error) {
            logger.error(`Failed to clear the custom ${kind} sound`, error);
            showToast(`Failed to clear the custom ${kind} sound.`, "failure");
        }
    }

    return (
        <div>
            <Forms.FormTitle tag="h3">Incoming call sound</Forms.FormTitle>
            <Forms.FormText>{soundFiles.call || "Using Discord's default sound."}</Forms.FormText>
            <Button onClick={() => chooseSound("call")}>Choose call sound</Button>
            {soundFiles.call && <Button onClick={() => clearSound("call")}>Use default</Button>}

            <Forms.FormTitle tag="h3">Notification sound</Forms.FormTitle>
            <Forms.FormText>{soundFiles.notification || "Using Discord's default sound."}</Forms.FormText>
            <Button onClick={() => chooseSound("notification")}>Choose notification sound</Button>
            {soundFiles.notification && <Button onClick={() => clearSound("notification")}>Use default</Button>}
        </div>
    );
}

function getSoundKind(name: string): SoundKind | undefined {
    if (name.startsWith("call_ringing")) return "call";
    if (name.startsWith("message") || name.startsWith("mention")) return "notification";
}

async function getAudioUrl(kind: SoundKind): Promise<string | undefined> {
    let filePromise = audioFileCache.get(kind);
    if (!filePromise) {
        filePromise = get<Blob>(DATA_STORE_KEYS[kind]).catch(error => {
            logger.error(`Failed to load the custom ${kind} sound`, error);
            return undefined;
        });
        audioFileCache.set(kind, filePromise);
    }

    const blob = await filePromise;
    if (!blob) return;

    const cachedUrl = audioUrlCache.get(kind);
    if (cachedUrl?.blob === blob) return cachedUrl.url;

    try {
        const url = URL.createObjectURL(blob);
        audioUrlCache.set(kind, { blob, url });
        createdAudioUrls.add(url);
        return url;
    } catch (error) {
        logger.error(`Failed to create a playback URL for the custom ${kind} sound`, error);
    }
}

let soundPrototype: WebAudioSoundConstructor["prototype"] | undefined;
let originalEnsureAudio: WebAudioSoundInstance["ensureAudio"] | undefined;

export default definePlugin({
    name: "SongChanger",
    description: "Choose separate custom sounds for incoming calls and notifications",
    tags: ["Notifications", "Voice"],
    authors: [Devs.Ven],
    settings,

    start() {
        soundPrototype = WebAudioSound.prototype;
        originalEnsureAudio = soundPrototype.ensureAudio;

        soundPrototype.ensureAudio = async function (this: WebAudioSoundInstance) {
            const audio = await originalEnsureAudio!.call(this);
            const kind = getSoundKind(this.name);
            if (!kind) return audio;

            if (!originalAudioSources.has(audio))
                originalAudioSources.set(audio, audio.src);

            const customUrl = await getAudioUrl(kind);
            const source = customUrl ?? originalAudioSources.get(audio)!;
            if (audio.src !== source) {
                audio.src = source;
                audio.load();
            }

            return audio;
        };
    },

    stop() {
        if (soundPrototype && originalEnsureAudio)
            soundPrototype.ensureAudio = originalEnsureAudio;

        for (const [audio, source] of originalAudioSources) {
            if (audio.src !== source) {
                audio.src = source;
                audio.load();
            }
        }
        originalAudioSources.clear();

        for (const url of createdAudioUrls)
            URL.revokeObjectURL(url);
        createdAudioUrls.clear();
        audioFileCache.clear();
        audioUrlCache.clear();
        soundPrototype = undefined;
        originalEnsureAudio = undefined;
    }
});
