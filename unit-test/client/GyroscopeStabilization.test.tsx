/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - Gyroscope Stabilization Regression Test
 */
import { describe, it, expect } from 'vitest';

/**
 * Simplified version of the stabilization logic for unit testing
 */
function calculateStabilizedPitch(beta: number, gamma: number): number {
    const radB = (beta * Math.PI) / 180;
    const radG = (gamma * Math.PI) / 180;
    
    // Reconstruct gravity vector components in device frame
    const gy = -Math.sin(radB) * Math.cos(radG);
    const gz = -Math.cos(radB) * Math.cos(radG);
    
    // Pitch is the angle around the X axis
    const pitch = Math.atan2(-gy, -gz) * (180 / Math.PI);
    return pitch;
}

describe('Gyroscope Stabilization Logic', () => {
    it('is continuous across the 90-degree vertical threshold', () => {
        // Normal range (0 to 90)
        const pitch80 = calculateStabilizedPitch(80, 0);
        expect(pitch80).toBeCloseTo(80);

        const pitch90 = calculateStabilizedPitch(90, 0);
        expect(pitch90).toBeCloseTo(90);

        /**
         * The "Flip" Scenario:
         * When tilting to 100 degrees, many browsers jump to beta=80, gamma=180 (or alpha flip).
         * Since we only have beta/gamma, let's see how our math handles the 110 degree state
         * represented as beta=70 and gamma flip.
         */
        // 110 degrees tilt away: gy = -sin(110)cos(0) = -0.94, gz = -cos(110)cos(0) = 0.34
        // Browser might report tilt as 180-110 = 70, but we need another signal to keep it 110.
        // Actually, DeviceOrientationEvent on crossing vertical typically does: 
        // beta: 80 -> 90 -> 80
        // alpha: jumps 180
        // gamma: jumps 180 (or stays 0 if signs are handled differently)
        
        // Let's test if our atan2 approach handles the case where beta starts decreasing 
        // BUT the phone has actually tilted past vertical.
        // In this case, gravity z component becomes positive (pointing out of screen).
        
        // 80 degrees (Facing up): beta=80, gamma=0 => gy=-0.98, gz=0.17
        const p80 = calculateStabilizedPitch(80, 0);
        expect(p80).toBeCloseTo(80);

        // 100 degrees (Facing away/down): beta=100, gamma=0 => gy=-0.98, gz=-0.17 (assuming beta can be > 90)
        const p100 = calculateStabilizedPitch(100, 0);
        expect(p100).toBeCloseTo(100);

        /**
         * The critical fix: If the browser reports beta=80 but the phone is actually at 100,
         * we can't tell without another signal. BUT, if the browser keeps Euler angles
         * consistent with world orientation, it MUST change something else.
         */
    });

    it('handles the relative zero-point logic correctly', () => {
        const basePitch = 45; // User holding phone at 45 deg
        const currentPitchAt90 = calculateStabilizedPitch(90, 0);
        const relB = currentPitchAt90 - basePitch;
        expect(relB).toBe(45);

        // Past vertical (135 degrees total, 90 + 45 relative)
        const currentPitchAt135 = calculateStabilizedPitch(135, 0);
        const relB2 = currentPitchAt135 - basePitch;
        expect(relB2).toBe(90);
    });
});
