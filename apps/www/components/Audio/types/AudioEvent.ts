export enum AudioEvent {
  PLAY = 'audio:play',
  PAUSE = 'audio:pause',
  RESUME = 'audio:resume',
  STOP = 'audio:stop',
  SEEK = 'audio:seek',
  FORWARD = 'audio:forward',
  BACKWARD = 'audio:backward',
  SYNC = 'audio:sync',
  PLAYBACK_RATE = 'audio:playbackRate',
  PREPARE = 'audio:prepare',
  QUEUE_UPDATE = 'audio:queueUpdate',
  QUEUE_ADVANCE = 'audio:queueAdvance',
}
