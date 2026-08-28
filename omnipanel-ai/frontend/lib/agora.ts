'use client';

// Agora RTC SDK — properly handles mic, volume indicators, and teardown.
// Import is dynamic to avoid SSR issues.

let _AgoraRTC: any = null;
let _client: any = null;
let _localMicTrack: any = null;
let _volumeInterval: ReturnType<typeof setInterval> | null = null;
let _isMuted = false;

async function getAgoraRTC() {
  if (!_AgoraRTC) {
    const mod = await import('agora-rtc-sdk-ng');
    _AgoraRTC = mod.default;
    _AgoraRTC.setLogLevel(3); // warnings only
  }
  return _AgoraRTC;
}

/**
 * Initialize and join Agora RTC channel.
 * @param appId    - Agora App ID (pass from env at runtime, NOT module level)
 * @param channel  - Channel name (= sessionId)
 * @param uid      - Numeric UID for this user
 * @param token    - RTC token from backend
 * @param onUserPublished  - Called when a remote user starts publishing
 * @param onUserUnpublished - Called when a remote user stops publishing
 * @param onVolumeIndicator - Called every 200ms with {uid, level} for all remote speakers
 */
export async function initRTC(
  appId: string,
  channel: string,
  uid: number,
  token: string,
  onUserPublished: (user: any, mediaType: string) => void,
  onUserUnpublished: (user: any) => void,
  onVolumeIndicator: (uid: number, level: number) => void,
): Promise<any> {
  const AgoraRTC = await getAgoraRTC();

  // Create client
  _client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  // Subscribe to remote audio automatically
  _client.on('user-published', async (user: any, mediaType: string) => {
    await _client.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
    onUserPublished(user, mediaType);
  });

  _client.on('user-unpublished', (user: any) => {
    onUserUnpublished(user);
  });

  // Enable volume indicator
  _client.enableAudioVolumeIndicator();
  _client.on('volume-indicator', (volumes: Array<{ uid: number; level: number }>) => {
    volumes.forEach(({ uid: remoteUid, level }) => {
      onVolumeIndicator(remoteUid, level);
    });
  });

  // Join channel — token can be null for testing (but real app needs it)
  await _client.join(appId, channel, token || null, uid);

  // Create and publish local microphone track
  try {
    _localMicTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: 'music_standard',
    });
    await _client.publish([_localMicTrack]);
    _isMuted = false;
  } catch (err) {
    console.warn('[Agora] Could not create mic track:', err);
  }

  return _client;
}

/** Toggle local microphone mute. Returns new isMuted state. */
export async function toggleMic(): Promise<boolean> {
  if (!_localMicTrack) return _isMuted;
  _isMuted = !_isMuted;
  await _localMicTrack.setMuted(_isMuted);
  return _isMuted;
}

/** Get current mic muted state. */
export function getMicMuted(): boolean {
  return _isMuted;
}

/** Stop all tracks and leave the channel. */
export async function teardownRTC(): Promise<void> {
  if (_volumeInterval) {
    clearInterval(_volumeInterval);
    _volumeInterval = null;
  }
  if (_localMicTrack) {
    _localMicTrack.stop();
    _localMicTrack.close();
    _localMicTrack = null;
  }
  if (_client) {
    try {
      await _client.leave();
    } catch (_) {}
    _client = null;
  }
  _AgoraRTC = null;
  _isMuted = false;
}

/** List available microphones. */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const AgoraRTC = await getAgoraRTC();
  return AgoraRTC.getMicrophones();
}

/** Quick mic permission test (creates + immediately destroys a track). */
export async function testMicAccess(): Promise<boolean> {
  try {
    const AgoraRTC = await getAgoraRTC();
    const track = await AgoraRTC.createMicrophoneAudioTrack();
    track.stop();
    track.close();
    return true;
  } catch {
    return false;
  }
}
