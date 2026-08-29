'use client';
import type AgoraRTC from 'agora-rtc-sdk-ng';
import type { IAgoraRTCClient, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

// Export type alias for use in pages
export type IAgoraRTCClientType = IAgoraRTCClient;

let AgoraRTCInstance: typeof AgoraRTC | null = null;
let rtcClient: IAgoraRTCClient | null = null;
let localMicTrack: IMicrophoneAudioTrack | null = null;
let audioLevelInterval: ReturnType<typeof setInterval> | null = null;

async function getAgoraRTC(): Promise<typeof AgoraRTC> {
  if (!AgoraRTCInstance) {
    AgoraRTCInstance = (await import('agora-rtc-sdk-ng')).default;
  }
  return AgoraRTCInstance;
}

export async function initRTC(
  appId: string,
  channel: string,
  uid: number,
  token: string,
  onUserPublished: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void,
  onUserUnpublished: (user: IAgoraRTCRemoteUser) => void,
  onAudioLevel: (uid: number, level: number) => void,
): Promise<IAgoraRTCClient> {
  const AgoraRTC = await getAgoraRTC();
  AgoraRTC.setLogLevel(3); // warn only
  
  rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  
  rtcClient.on('user-published', async (user, mediaType) => {
    if (mediaType !== 'audio' && mediaType !== 'video') return;
    await rtcClient!.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
    onUserPublished(user, mediaType);
  });
  
  rtcClient.on('user-unpublished', onUserUnpublished);
  
  await rtcClient.join(appId, channel, token, uid);
  
  localMicTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await rtcClient.publish([localMicTrack]);
  
  // Audio level monitoring
  audioLevelInterval = setInterval(() => {
    const levels = rtcClient!.getRemoteAudioStats();
    Object.entries(levels).forEach(([uidStr, stats]) => {
      onAudioLevel(parseInt(uidStr), (stats as any).receiveLevel ?? 0);
    });
  }, 100);
  
  return rtcClient;
}

export async function toggleMic(): Promise<boolean> {
  if (!localMicTrack) return false;
  const isMuted = localMicTrack.muted;
  await localMicTrack.setMuted(!isMuted);
  return !isMuted;
}

export async function teardownRTC(): Promise<void> {
  if (audioLevelInterval) {
    clearInterval(audioLevelInterval);
    audioLevelInterval = null;
  }
  if (localMicTrack) {
    localMicTrack.stop();
    localMicTrack.close();
    localMicTrack = null;
  }
  if (rtcClient) {
    await rtcClient.leave();
    rtcClient = null;
  }
}

export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const AgoraRTC = await getAgoraRTC();
  return AgoraRTC.getMicrophones();
}

export async function testMicAccess(): Promise<boolean> {
  try {
    const AgoraRTC = await getAgoraRTC();
    const track = await AgoraRTC.createMicrophoneAudioTrack();
    track.stop();
    track.close();
    return true;
  } catch (e) {
    return false;
  }
}
