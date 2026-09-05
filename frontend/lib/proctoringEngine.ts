/**
 * VERITAS AI Proctor - Multi-Signal Behavioral Fusion & Anti-Cheating Engine
 * Ported and adapted from NO-CHEATING-BRO- (VERITAS AI Proctoring System)
 * 
 * Implements:
 * 1. 7 Behavioral Channels (Eye Gaze, Head Pose, Hand Gestures, Multi-Person, Presence, Calmness, Speech Fluency)
 * 2. Probabilistic Multi-Modal Fusion ("No Single Signal = Cheating")
 * 3. Compound Penalty Deductions (Secondary Person, Multiple Voices, Gaze+Head, Device Reaching, Tab Switches)
 * 4. Hackathon Presentation Demo Simulator (Live, Normal, Distracted, Suspicious, Multi-Person)
 */

export interface ProctorWeights {
  eye_gaze: number;          // 30% Eye & Gaze stability
  face_presence: number;     // 15% Continuous face presence
  multiple_person: number;   // 20% Single-person verification
  head_orientation: number;  // 10% Head alignment & attention
  hand_activity: number;     // 10% Hand movement normalcy
  speech_hesitation: number; // 10% Speech fluency vs hesitation
  consistency: number;       // 5%  Cross-modal temporal consistency
}

export const DEFAULT_PROCTOR_WEIGHTS: ProctorWeights = {
  eye_gaze: 0.30,
  face_presence: 0.15,
  multiple_person: 0.20,
  head_orientation: 0.10,
  hand_activity: 0.10,
  speech_hesitation: 0.10,
  consistency: 0.05
};

export interface ProctorEvent {
  timestamp: string;
  epoch_time?: number;
  type: string;
  description: string;
  duration?: number;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  score_impact: number;
}

export interface VisionState {
  timestamp: number;
  status: 'NORMAL' | 'ATTENTION' | 'SUSPICIOUS';
  face_count: number;
  face_presence: 'NO CANDIDATE DETECTED' | 'CANDIDATE DETECTED' | 'MULTIPLE PEOPLE DETECTED';
  gaze_direction: string;
  gaze_ratio_x: number;
  gaze_ratio_y: number;
  ear: number;
  blink_count: number;
  blink_rate_bpm: number;
  head_yaw: number;
  head_pitch: number;
  head_roll: number;
  gaze_stability_score: number;
  screen_attention_score: number;
  head_attention_score: number;
  hand_count: number;
  hand_activity_score: number;
  hand_state: 'NORMAL' | 'ACTIVE' | 'ELEVATED';
  hand_gesture: string;
  facial_expression: string;
  behavioral_calmness_score: number;
  fps: number;
  second_person_alert: boolean;
  anomaly_events?: ProctorEvent[];
}

export interface AudioState {
  live_transcript?: string;
  total_words: number;
  filler_count: number;
  long_pauses: number;
  speech_confidence_score: number;
  hesitation_state: 'FLUENT' | 'MODERATE_HESITATION' | 'ELEVATED_HESITATION';
  feedback: string;
  multiple_voices_detected: boolean;
  voice_status: string;
  candidate_pitch_hz?: number | null;
}

export interface ScoringResult {
  integrity_score: number;
  confidence_score: number;
  screen_attention_score: number;
  gaze_stability_score: number;
  head_attention_score: number;
  hand_activity_score: number;
  speech_confidence_score: number;
  face_presence_score: number;
  behavioral_calmness_score: number;
  behavioral_consistency_score: number;
  compound_penalty: number;
  assessment: 'LOW SUSPICION' | 'MODERATE SUSPICION' | 'HIGH SUSPICION';
  assessment_desc: string;
  badge_color: 'green' | 'yellow' | 'red';
  weights: ProctorWeights;
  observations: {
    positive: string[];
    cautions: string[];
  };
  components: {
    eye_gaze_contrib: number;
    presence_contrib: number;
    multi_person_contrib: number;
    head_contrib: number;
    hand_contrib: number;
    speech_contrib: number;
    consistency_contrib: number;
  };
}

export class ProctorScoringEngine {
  private weights: ProctorWeights;
  private totalFrames: number = 0;
  private validFaceFrames: number = 0;
  private multiFaceFrames: number = 0;

  constructor(weights: ProctorWeights = DEFAULT_PROCTOR_WEIGHTS) {
    this.weights = { ...weights };
    this.normalizeWeights();
  }

  private normalizeWeights() {
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const k in this.weights) {
        const key = k as keyof ProctorWeights;
        this.weights[key] = Math.round((this.weights[key] / total) * 100) / 100;
      }
    }
  }

  public computeScores(
    vision: VisionState,
    audio: AudioState,
    events: ProctorEvent[] = []
  ): ScoringResult {
    this.totalFrames += 1;
    const fc = vision.face_count || 0;
    if (fc === 1) this.validFaceFrames += 1;
    else if (fc > 1) this.multiFaceFrames += 1;

    // 1. Raw Scores (0-100)
    const gazeStability = vision.gaze_stability_score ?? 90;
    const screenAttention = vision.screen_attention_score ?? 92;
    const eyeScore = 0.5 * gazeStability + 0.5 * screenAttention;

    const presenceRatio = this.validFaceFrames / Math.max(1, this.totalFrames);
    const presenceScore = Math.min(99, Math.max(30, Math.round(presenceRatio * 100)));

    const multiRatio = this.multiFaceFrames / Math.max(1, this.totalFrames);
    const secondPersonActive = fc >= 2 || vision.second_person_alert;
    const multiPersonScore = secondPersonActive
      ? 15
      : Math.min(100, Math.max(20, Math.round(100 - multiRatio * 300)));

    const headScore = vision.head_attention_score ?? 92;
    const handScore = vision.hand_activity_score ?? 94;

    let speechScore = audio.speech_confidence_score ?? 88;
    if (audio.multiple_voices_detected) {
      speechScore = Math.min(speechScore, 30);
    }

    const calmnessScore = vision.behavioral_calmness_score ?? 90;
    const consistencyScore = Math.round(eyeScore * 0.4 + headScore * 0.3 + speechScore * 0.3);

    // 2. Compound Event Impact ("No Single Signal = Cheating")
    const now = Date.now();
    const recentEvents = events.filter(e => !e.epoch_time || (now - e.epoch_time) < 45000);

    const hasGazeAnomaly = recentEvents.some(e => e.type === 'gaze_deviation');
    const hasHeadAnomaly = recentEvents.some(e => e.type === 'head_deviation');
    const hasMultiFace = recentEvents.some(e => e.type === 'multiple_faces') || secondPersonActive;
    const hasSpeechHesitation = audio.hesitation_state === 'ELEVATED_HESITATION';
    const hasHandOffscreen = recentEvents.some(e => e.type === 'hand_offscreen' || e.type === 'hand_activity');
    const hasContextSwitch = recentEvents.some(e => e.type === 'context_switch' || e.type === 'TAB_SWITCH');

    let compoundPenalty = 0;

    // Critical 1: Unauthorized 2nd person in view
    if (secondPersonActive) compoundPenalty += 45;

    // Critical 2: Multiple voices
    if (audio.multiple_voices_detected) compoundPenalty += 30;

    // Critical 3: 2nd person + Secondary voice
    if (secondPersonActive && audio.multiple_voices_detected) compoundPenalty += 20;

    // Compound 4: Gaze off-screen + Head turned away together
    if (hasGazeAnomaly && hasHeadAnomaly) compoundPenalty += 8;

    // Compound 5: Gaze deviation + Speech hesitation (reading off-screen answers)
    if (hasGazeAnomaly && hasSpeechHesitation) compoundPenalty += 10;

    // Compound 6: Multiple faces + Gaze deviation (conferring with another person)
    if (hasMultiFace && hasGazeAnomaly) compoundPenalty += 18;

    // Compound 7: Hand reaching off-screen + Gaze deviation (using secondary device)
    if (hasHandOffscreen && hasGazeAnomaly) compoundPenalty += 12;

    // Compound 8: Context switch away from exam tab
    if (hasContextSwitch) compoundPenalty += 15;

    // 3. Weighted Calculation
    const weightedSum =
      eyeScore * this.weights.eye_gaze +
      presenceScore * this.weights.face_presence +
      multiPersonScore * this.weights.multiple_person +
      headScore * this.weights.head_orientation +
      handScore * this.weights.hand_activity +
      speechScore * this.weights.speech_hesitation +
      consistencyScore * this.weights.consistency;

    const finalIntegrity = Math.min(99, Math.max(12, Math.round(weightedSum - compoundPenalty)));
    const confidenceScore = Math.min(
      98,
      Math.max(15, Math.round(speechScore * 0.45 + calmnessScore * 0.30 + screenAttention * 0.25))
    );

    // 4. Assessment Level
    let assessment: 'LOW SUSPICION' | 'MODERATE SUSPICION' | 'HIGH SUSPICION';
    let assessmentDesc = '';
    let badgeColor: 'green' | 'yellow' | 'red';

    if (secondPersonActive) {
      assessment = 'HIGH SUSPICION';
      assessmentDesc = 'CRITICAL VIOLATION: Unauthorized second person detected in camera view! Immediate proctor review required.';
      badgeColor = 'red';
    } else if (audio.multiple_voices_detected) {
      assessment = finalIntegrity < 60 ? 'HIGH SUSPICION' : 'MODERATE SUSPICION';
      assessmentDesc = 'ACOUSTIC VIOLATION: Multiple distinct vocal pitch baselines detected (secondary speaker present).';
      badgeColor = finalIntegrity < 60 ? 'red' : 'yellow';
    } else if (finalIntegrity >= 80) {
      assessment = 'LOW SUSPICION';
      assessmentDesc = 'Low behavioral anomaly level. Candidate demonstrated consistent screen attention and organic responses.';
      badgeColor = 'green';
    } else if (finalIntegrity >= 60) {
      assessment = 'MODERATE SUSPICION';
      assessmentDesc = 'Elevated behavioral indicators detected. Additional review recommended for specific flagged timestamps.';
      badgeColor = 'yellow';
    } else {
      assessment = 'HIGH SUSPICION';
      assessmentDesc = 'Significant recurring behavioral anomaly patterns detected across multiple signals. Detailed audit required.';
      badgeColor = 'red';
    }

    // 5. Observations
    const positive: string[] = [];
    const cautions: string[] = [];

    if (secondPersonActive) {
      cautions.push('CRITICAL: Unauthorized secondary person detected in candidate perimeter.');
    } else if (multiPersonScore >= 85) {
      positive.push('Single face confirmed; no unauthorized secondary person detected.');
    } else {
      cautions.push('Multiple faces detected in camera frame during session.');
    }

    if (audio.multiple_voices_detected) {
      cautions.push('ACOUSTIC ALERT: Multiple distinct vocal pitch baselines detected (secondary speaker).');
    } else if (speechScore >= 80) {
      positive.push('Speech delivery was fluent with consistent single vocal baseline.');
    } else {
      cautions.push('Elevated speech hesitation and filler word frequency detected.');
    }

    if (presenceScore >= 90) {
      positive.push('Candidate remained clearly visible throughout the recorded duration.');
    } else {
      cautions.push('Candidate had intermittent camera absence or was partially out of frame.');
    }

    if (eyeScore >= 80) {
      positive.push('Mostly stable screen gaze with natural cognitive saccades.');
    } else {
      cautions.push('Several sustained gaze deviations away from the active display.');
    }

    if (headScore >= 80) {
      positive.push('Head orientation remained consistently centered toward screen.');
    } else {
      cautions.push('Frequent or prolonged head orientation away from center.');
    }

    if (handScore >= 85) {
      positive.push('Hand activity was normal with natural conversational gestures.');
    } else {
      cautions.push('Elevated hand activity or movement toward off-screen regions.');
    }

    if (compoundPenalty > 0) {
      cautions.push('Multi-modal compound alignment observed (correlated gaze/head/speech/context deviations).');
    }

    return {
      integrity_score: finalIntegrity,
      confidence_score: confidenceScore,
      screen_attention_score: screenAttention,
      gaze_stability_score: gazeStability,
      head_attention_score: headScore,
      hand_activity_score: handScore,
      speech_confidence_score: speechScore,
      face_presence_score: presenceScore,
      behavioral_calmness_score: calmnessScore,
      behavioral_consistency_score: consistencyScore,
      compound_penalty: compoundPenalty,
      assessment,
      assessment_desc: assessmentDesc,
      badge_color: badgeColor,
      weights: { ...this.weights },
      observations: { positive, cautions },
      components: {
        eye_gaze_contrib: Math.round(eyeScore * this.weights.eye_gaze * 10) / 10,
        presence_contrib: Math.round(presenceScore * this.weights.face_presence * 10) / 10,
        multi_person_contrib: Math.round(multiPersonScore * this.weights.multiple_person * 10) / 10,
        head_contrib: Math.round(headScore * this.weights.head_orientation * 10) / 10,
        hand_contrib: Math.round(handScore * this.weights.hand_activity * 10) / 10,
        speech_contrib: Math.round(speechScore * this.weights.speech_hesitation * 10) / 10,
        consistency_contrib: Math.round(consistencyScore * this.weights.consistency * 10) / 10
      }
    };
  }

  public reset() {
    this.totalFrames = 0;
    this.validFaceFrames = 0;
    this.multiFaceFrames = 0;
  }
}

/**
 * Hackathon Demo Simulator for Live Presentation
 * Generates synthetic realistic video frames and multi-modal telemetry
 * for 4 core scenarios: Normal, Distracted, Suspicious Device Usage, Multi-Person Alert
 */
export class DemoScenarioSimulator {
  private scenario: 'live' | 'demo_1' | 'demo_2' | 'demo_3' | 'demo_4' = 'live';
  private startTime: number = Date.now();
  private lastEventTime: number = 0;

  public setScenario(s: 'live' | 'demo_1' | 'demo_2' | 'demo_3' | 'demo_4') {
    this.scenario = s;
    this.startTime = Date.now();
    this.lastEventTime = Date.now();
  }

  public getScenario() {
    return this.scenario;
  }

  public isDemoActive(): boolean {
    return this.scenario !== 'live';
  }

  public generateTelemetry(tSec?: number): { vision: VisionState; audio: AudioState; events: ProctorEvent[] } {
    const now = Date.now();
    const t = tSec !== undefined ? tSec : (now - this.startTime) / 1000;
    const events: ProctorEvent[] = [];

    let gaze_dir = 'CENTER';
    let gaze_x = 0.50;
    let gaze_y = 0.50;
    let yaw = 0;
    let pitch = 0;
    let roll = 0;
    let ear = 0.30;
    let face_cnt = 1;
    let face_presence: 'NO CANDIDATE DETECTED' | 'CANDIDATE DETECTED' | 'MULTIPLE PEOPLE DETECTED' = 'CANDIDATE DETECTED';
    let hand_cnt = 0;
    let hand_score = 95;
    let hand_state: 'NORMAL' | 'ACTIVE' | 'ELEVATED' = 'NORMAL';
    let hand_gesture = 'Resting / On Keyboard';
    let gaze_stability = 95;
    let screen_attention = 96;
    let head_attention = 96;
    let status: 'NORMAL' | 'ATTENTION' | 'SUSPICIOUS' = 'NORMAL';
    let expr = 'Engaged';
    let calmness = 94;
    let speech_score = 90;
    let hesitation_state: 'FLUENT' | 'MODERATE_HESITATION' | 'ELEVATED_HESITATION' = 'FLUENT';
    let multiple_voices = false;
    let voice_status = 'SINGLE VOICE VERIFIED';
    let transcript = '';

    if (this.scenario === 'demo_1') {
      // Normal Candidate
      gaze_dir = 'CENTER';
      gaze_x = 0.50 + 0.04 * Math.sin(t * 1.2);
      gaze_y = 0.50 + 0.03 * Math.cos(t * 0.9);
      yaw = 2.0 * Math.sin(t * 0.8);
      pitch = -1.0 + 1.5 * Math.cos(t * 0.6);
      roll = 0.8 * Math.sin(t * 0.5);
      ear = Math.floor(t * 10) % 35 !== 0 ? 0.29 : 0.12;
      hand_cnt = Math.floor(t) % 6 < 3 ? 1 : 0;
      hand_gesture = hand_cnt > 0 ? 'Open Palm Gesturing' : 'Resting / On Keyboard';
      transcript = 'In our microservices architecture, we utilized Redis for distributed caching to keep p99 latency under 15 milliseconds.';
    } else if (this.scenario === 'demo_2') {
      // Distracted Candidate
      const cycle = Math.floor(t) % 8;
      if (cycle < 3) {
        gaze_dir = 'CENTER';
        gaze_x = 0.51;
        gaze_y = 0.49;
        yaw = 4.0; pitch = -2.0; roll = 1.0;
      } else if (cycle < 6) {
        gaze_dir = 'UP-LEFT';
        gaze_x = 0.72;
        gaze_y = 0.28;
        yaw = -16.0; pitch = 12.0; roll = -3.0;
      } else {
        gaze_dir = 'RIGHT';
        gaze_x = 0.26;
        gaze_y = 0.52;
        yaw = 18.0; pitch = -4.0; roll = 2.0;
      }
      hand_cnt = 1;
      hand_state = 'ACTIVE';
      hand_gesture = 'Hand Touching Chin';
      gaze_stability = 74;
      screen_attention = 68;
      head_attention = 76;
      status = 'ATTENTION';
      expr = 'Distracted';
      calmness = 78;
      speech_score = 72;
      hesitation_state = 'MODERATE_HESITATION';
      transcript = 'Uh, so the database... I think we had PostgreSQL or maybe MongoDB... wait, let me recall...';

      if (now - this.lastEventTime > 4500) {
        this.lastEventTime = now;
        events.push({
          timestamp: new Date().toLocaleTimeString(),
          epoch_time: now,
          type: 'gaze_deviation',
          description: `Frequent gaze shift toward ${gaze_dir} (wandering attention)`,
          duration: 2.8,
          severity: 'LOW',
          score_impact: -4
        });
      }
    } else if (this.scenario === 'demo_3') {
      // Suspicious Behavior (Offscreen / Secondary Device)
      gaze_dir = 'DOWN-RIGHT';
      gaze_x = 0.22 + 0.05 * Math.sin(t * 3.0);
      gaze_y = 0.78 + 0.04 * Math.cos(t * 2.5);
      yaw = 29.5 + 4.0 * Math.sin(t * 1.5);
      pitch = -19.0 + 3.0 * Math.cos(t * 1.2);
      roll = 6.0;
      hand_cnt = 2;
      hand_score = 52;
      hand_state = 'ELEVATED';
      hand_gesture = 'Reaching Off-Screen / Device Interaction';
      gaze_stability = 56;
      screen_attention = 44;
      head_attention = 52;
      status = 'SUSPICIOUS';
      expr = 'Nervous-looking';
      calmness = 58;
      speech_score = 55;
      hesitation_state = 'ELEVATED_HESITATION';
      transcript = 'Um... actually... the algorithm... uh, like you know, it has O(N log N) complexity because... um...';

      if (now - this.lastEventTime > 3800) {
        this.lastEventTime = now;
        events.push({
          timestamp: new Date().toLocaleTimeString(),
          epoch_time: now,
          type: 'compound_alert',
          description: 'Synchronized Head & Gaze Off-Screen + Rapid Off-Screen Hand Movement',
          duration: 3.6,
          severity: 'HIGH',
          score_impact: -16
        });
      }
    } else if (this.scenario === 'demo_4') {
      // Multiple Person Intrusion
      gaze_dir = Math.floor(t) % 6 > 2 ? 'RIGHT' : 'CENTER';
      gaze_x = gaze_dir === 'RIGHT' ? 0.28 : 0.50;
      yaw = gaze_dir === 'RIGHT' ? 24.0 : 2.0;
      face_cnt = 2;
      face_presence = 'MULTIPLE PEOPLE DETECTED';
      hand_cnt = 1;
      hand_state = 'ACTIVE';
      hand_gesture = 'Conferring Gesture';
      gaze_stability = 65;
      screen_attention = 62;
      head_attention = 68;
      status = 'SUSPICIOUS';
      expr = 'Stressed-looking';
      calmness = 54;
      speech_score = 48;
      multiple_voices = true;
      voice_status = 'MULTIPLE VOICES DETECTED (Δ 64 Hz)';
      transcript = 'Yes, as I was saying... (unintelligible secondary whisper)... the cache invalidation strategy...';

      if (now - this.lastEventTime > 4000) {
        this.lastEventTime = now;
        events.push({
          timestamp: new Date().toLocaleTimeString(),
          epoch_time: now,
          type: 'multiple_faces',
          description: 'Secondary unauthorized face detected in camera perimeter (Duration: 3.8s)',
          duration: 3.8,
          severity: 'HIGH',
          score_impact: -22
        });
      }
    }

    const visionState: VisionState = {
      timestamp: now,
      status,
      face_count: face_cnt,
      face_presence,
      gaze_direction: gaze_dir,
      gaze_ratio_x: Math.round(gaze_x * 100) / 100,
      gaze_ratio_y: Math.round(gaze_y * 100) / 100,
      ear: Math.round(ear * 100) / 100,
      blink_count: Math.floor(t * 0.28),
      blink_rate_bpm: this.scenario === 'demo_1' ? 17.0 : 28.0,
      head_yaw: Math.round(yaw * 10) / 10,
      head_pitch: Math.round(pitch * 10) / 10,
      head_roll: Math.round(roll * 10) / 10,
      gaze_stability_score: gaze_stability,
      screen_attention_score: screen_attention,
      head_attention_score: head_attention,
      hand_count: hand_cnt,
      hand_activity_score: hand_score,
      hand_state,
      hand_gesture,
      facial_expression: expr,
      behavioral_calmness_score: calmness,
      fps: 30.0,
      second_person_alert: face_cnt >= 2,
      anomaly_events: events
    };

    const audioState: AudioState = {
      live_transcript: transcript,
      total_words: Math.floor(t * 2.2),
      filler_count: this.scenario === 'demo_1' ? 1 : Math.floor(t * 0.4),
      long_pauses: this.scenario === 'demo_1' ? 0 : 3,
      speech_confidence_score: speech_score,
      hesitation_state,
      feedback: hesitation_state === 'FLUENT' ? 'Natural speech flow' : 'Hesitation detected',
      multiple_voices_detected: multiple_voices,
      voice_status,
      candidate_pitch_hz: 142.5
    };

    return { vision: visionState, audio: audioState, events };
  }

  /**
   * Renders simulated video frames onto an HTML5 Canvas for the video viewport
   */
  public drawSimulatedCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, tSec?: number) {
    const t = tSec !== undefined ? tSec : (Date.now() - this.startTime) / 1000;
    const { vision } = this.generateTelemetry(t);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(1, '#131a24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Grid lines for high-tech proctoring feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Candidate Face Center
    const cx = width * 0.46 + vision.head_yaw * 1.5;
    const cy = height * 0.46 + vision.head_pitch * 1.2;
    const fw = 140;
    const fh = 180;

    // Head Silhouette
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((vision.head_roll * Math.PI) / 180);

    // Face oval
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 0, fw / 2, fh / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = vision.status === 'NORMAL' ? '#00e5ff' : (vision.status === 'ATTENTION' ? '#fbbf24' : '#ef4444');
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle facial wireframe
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -fh / 2);
    ctx.lineTo(0, fh / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -10, fw / 2 - 15, 25, 0, 0, Math.PI);
    ctx.stroke();

    // Eyes
    const leftEyeX = -35;
    const rightEyeX = 35;
    const eyeY = -25;
    const eyeH = Math.max(3, 14 * (vision.ear / 0.28));

    // Eye sockets
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, 12, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(rightEyeX, eyeY, 12, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Irises
    const irisLx = leftEyeX + (vision.gaze_ratio_x - 0.5) * 16;
    const irisLy = eyeY + (vision.gaze_ratio_y - 0.5) * 8;
    const irisRx = rightEyeX + (vision.gaze_ratio_x - 0.5) * 16;
    const irisRy = eyeY + (vision.gaze_ratio_y - 0.5) * 8;

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(irisLx, irisLy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(irisRx, irisRy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Gaze Vectors
    const rayDx = (vision.gaze_ratio_x - 0.5) * 55;
    const rayDy = (vision.gaze_ratio_y - 0.5) * 40;
    ctx.strokeStyle = vision.gaze_direction === 'CENTER' ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(irisLx, irisLy);
    ctx.lineTo(irisLx + rayDx, irisLy + rayDy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(irisRx, irisRy);
    ctx.lineTo(irisRx + rayDx, irisRy + rayDy);
    ctx.stroke();

    // 3D Head Orientation Axes on Nose
    const noseX = 0;
    const noseY = 5;

    // X Axis (Yaw - Red)
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(noseX + vision.head_yaw * 1.8, noseY);
    ctx.stroke();

    // Y Axis (Pitch - Green)
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(noseX, noseY + vision.head_pitch * 1.5);
    ctx.stroke();

    // Z Axis (Depth - Yellow)
    ctx.strokeStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(noseX - vision.head_yaw, noseY - 35);
    ctx.stroke();

    ctx.restore();

    // Candidate Bounding Box
    const bx1 = cx - fw / 2 - 12;
    const by1 = cy - fh / 2 - 15;
    const bw = fw + 24;
    const bh = fh + 30;
    const boxCol = vision.status === 'NORMAL' ? '#10b981' : (vision.status === 'ATTENTION' ? '#f59e0b' : '#ef4444');

    ctx.strokeStyle = boxCol;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx1, by1, bw, bh);

    ctx.fillStyle = boxCol;
    ctx.font = 'bold 11px monospace';
    ctx.fillText('CANDIDATE #1042', bx1 + 4, by1 - 6);

    // Hands
    if (vision.hand_count > 0) {
      const hx = width * 0.35 + 25 * Math.sin(t * 2);
      const hy = height * 0.82 + 12 * Math.cos(t * 3);
      ctx.fillStyle = '#00f0c8';
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00f0c8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - 15, hy - 25);
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx, hy - 30);
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + 15, hy - 26);
      ctx.stroke();
    }

    if (vision.hand_count >= 2) {
      // Suspicious second hand reaching off-camera
      const hx2 = width * 0.86;
      const hy2 = height * 0.84 + 10 * Math.sin(t * 4);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(hx2, hy2, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx2, hy2);
      ctx.lineTo(hx2 + 25, hy2 + 20);
      ctx.stroke();
    }

    // Secondary Person Render (Scenario 4)
    if (this.scenario === 'demo_4') {
      const sCx = width * 0.84;
      const sCy = height * 0.40;
      const sFw = 95;
      const sFh = 125;

      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.ellipse(sCx, sCy, sFw / 2, sFh / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sCx, sCy, sFw / 2, sFh / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Red Warning Intrusion Box
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(sCx - sFw / 2 - 8, sCy - sFh / 2 - 10, sFw + 16, sFh + 20);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('2ND PERSON DETECTED', sCx - sFw / 2 - 6, sCy - sFh / 2 - 14);

      // Top Red Flashing Alert Banner
      ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
      ctx.fillRect(0, 0, width, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('🚨 UNAUTHORIZED PERSON DETECTED IN CAMERA PERIMETER', 16, 20);
    }
  }
}
