/**
 * Sound effects service for KDS notifications
 * Provides audio feedback for order events
 */

export type SoundType = 'newOrder' | 'orderReady' | 'alert' | 'success'

interface SoundConfig {
  volume: number
  enabled: boolean
}

export class SoundEffectsService {
  private audioContext: AudioContext | null = null
  private config: SoundConfig = {
    volume: 0.5,
    enabled: true
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  init(): void {
    if (!this.audioContext && typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext()
    }
  }

  /**
   * Play a sound effect
   */
  async play(soundType: SoundType): Promise<void> {
    if (!this.config.enabled || !this.audioContext) {
      return
    }

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Configure sound based on type
      const soundConfig = this.getSoundConfig(soundType)
      oscillator.frequency.value = soundConfig.frequency
      oscillator.type = soundConfig.waveform
      
      // Set volume
      gainNode.gain.value = this.config.volume * soundConfig.volumeMultiplier

      // Apply envelope
      const now = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(
        this.config.volume * soundConfig.volumeMultiplier, 
        now + 0.01
      )
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + soundConfig.duration)

      // Play sound
      oscillator.start(now)
      oscillator.stop(now + soundConfig.duration)
    } catch (error) {
      console.error('Failed to play sound:', error)
    }
  }

  /**
   * Get sound configuration for each type
   */
  private getSoundConfig(soundType: SoundType) {
    switch (soundType) {
      case 'newOrder':
        return {
          frequency: 880, // A5
          waveform: 'sine' as OscillatorType,
          duration: 0.3,
          volumeMultiplier: 0.8
        }
      case 'orderReady':
        return {
          frequency: 1318.51, // E6
          waveform: 'sine' as OscillatorType,
          duration: 0.5,
          volumeMultiplier: 1.0
        }
      case 'alert':
        return {
          frequency: 440, // A4
          waveform: 'square' as OscillatorType,
          duration: 0.2,
          volumeMultiplier: 0.6
        }
      case 'success':
        return {
          frequency: 659.25, // E5
          waveform: 'sine' as OscillatorType,
          duration: 0.4,
          volumeMultiplier: 0.7
        }
    }
  }

  /**
   * Play a sequence of notes (for more complex notifications)
   */
  async playSequence(notes: Array<{ frequency: number; duration: number }>): Promise<void> {
    if (!this.config.enabled || !this.audioContext) {
      return
    }

    let currentTime = this.audioContext.currentTime

    for (const note of notes) {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.value = note.frequency
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, currentTime)
      gainNode.gain.linearRampToValueAtTime(this.config.volume * 0.5, currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + note.duration)

      currentTime += note.duration
    }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): SoundConfig {
    return { ...this.config }
  }

  /**
   * Toggle sound on/off
   */
  toggle(): void {
    this.config.enabled = !this.config.enabled
  }
}

// Export singleton instance
export const soundEffects = new SoundEffectsService()
export const soundEffectsService = soundEffects // Alias for backward compatibility

// Export sound presets
export const soundPresets = {
  newOrderChime: () => soundEffects.playSequence([
    { frequency: 659.25, duration: 0.1 }, // E5
    { frequency: 783.99, duration: 0.1 }, // G5
    { frequency: 1046.50, duration: 0.2 } // C6
  ]),
  
  orderReadyChime: () => soundEffects.playSequence([
    { frequency: 523.25, duration: 0.15 }, // C5
    { frequency: 659.25, duration: 0.15 }, // E5
    { frequency: 783.99, duration: 0.15 }, // G5
    { frequency: 1046.50, duration: 0.3 }  // C6
  ])
}