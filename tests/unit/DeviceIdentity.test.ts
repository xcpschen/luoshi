import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceIdentity, DeviceIdentityCache } from './DeviceIdentity';

describe('DeviceIdentity', () => {
    describe('generateHardwareId', () => {
        it('should generate USB hardware ID for USB device', async () => {
            const mockDevice = {
                id: 'ABC123XYZ',
                model: 'Pixel 6',
                sdkVersion: 33,
            };
            
            const hardwareId = await DeviceIdentity.generateHardwareId(mockDevice as any);
            
            expect(hardwareId).toBe('usb:ABC123XYZ');
        });
        
        it('should generate MAC-based hardware ID for WiFi device', async () => {
            const mockDevice = {
                id: '192.168.1.100:5555',
                model: 'Pixel 6',
                sdkVersion: 33,
            };
            
            // Mock MAC address retrieval
            const originalGetMAC = DeviceIdentity.getDeviceMACAddress;
            vi.spyOn(DeviceIdentity, 'getDeviceMACAddress').mockResolvedValue('aa:bb:cc:dd:ee:ff');
            
            const hardwareId = await DeviceIdentity.generateHardwareId(mockDevice as any);
            
            expect(hardwareId).toBe('mac:aa:bb:cc:dd:ee:ff');
            
            // Restore
            vi.restoreAllMocks();
        });
        
        it('should fallback to model+SDK for unknown device', async () => {
            const mockDevice = {
                id: '192.168.1.100:5555',
                model: 'Pixel 6',
                sdkVersion: 33,
            };
            
            vi.spyOn(DeviceIdentity, 'getDeviceMACAddress').mockResolvedValue(null);
            
            const hardwareId = await DeviceIdentity.generateHardwareId(mockDevice as any);
            
            expect(hardwareId).toBe('model:Pixel 6:33');
            
            vi.restoreAllMocks();
        });
    });
    
    describe('isValidMACAddress', () => {
        it('should validate correct MAC addresses', () => {
            const validMACs = [
                'aa:bb:cc:dd:ee:ff',
                'AA:BB:CC:DD:EE:FF',
                '00:11:22:33:44:55',
            ];
            
            for (const mac of validMACs) {
                expect(DeviceIdentity['isValidMACAddress'](mac)).toBe(true);
            }
        });
        
        it('should reject invalid MAC addresses', () => {
            const invalidMACs = [
                'invalid',
                'aa:bb:cc:dd:ee',
                'aa:bb:cc:dd:ee:ff:gg',
                'aabbccddee',
            ];
            
            for (const mac of invalidMACs) {
                expect(DeviceIdentity['isValidMACAddress'](mac)).toBe(false);
            }
        });
    });
    
    describe('generateFingerprint', () => {
        it('should generate consistent fingerprint', () => {
            const fingerprint1 = DeviceIdentity.generateFingerprint('Pixel 6', '13', 33);
            const fingerprint2 = DeviceIdentity.generateFingerprint('Pixel 6', '13', 33);
            
            expect(fingerprint1).toBe(fingerprint2);
        });
        
        it('should generate different fingerprints for different devices', () => {
            const fingerprint1 = DeviceIdentity.generateFingerprint('Pixel 6', '13', 33);
            const fingerprint2 = DeviceIdentity.generateFingerprint('Pixel 7', '14', 34);
            
            expect(fingerprint1).not.toBe(fingerprint2);
        });
    });
    
    describe('matchExistingDevice', () => {
        it('should match device by hardware ID', async () => {
            const mockDevice = {
                id: 'ABC123',
                model: 'Pixel 6',
                sdkVersion: 33,
            };
            
            const existingDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        fingerprint: 'fingerprint-1',
                    },
                },
            ];
            
            const matched = await DeviceIdentity.matchExistingDevice(
                mockDevice as any,
                existingDevices as any
            );
            
            expect(matched).not.toBeNull();
            expect(matched?.unifiedId).toBe('uuid-1');
        });
        
        it('should return null for no match', async () => {
            const mockDevice = {
                id: 'ABC123',
                model: 'Pixel 6',
                sdkVersion: 33,
            };
            
            const existingDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:XYZ789',
                        fingerprint: 'fingerprint-1',
                    },
                },
            ];
            
            const matched = await DeviceIdentity.matchExistingDevice(
                mockDevice as any,
                existingDevices as any
            );
            
            expect(matched).toBeNull();
        });
    });
});

describe('DeviceIdentityCache', () => {
    beforeEach(() => {
        // Clear cache before each test
        DeviceIdentityCache['cache'].clear();
    });
    
    it('should cache and retrieve hardware ID', () => {
        DeviceIdentityCache.set('device-1', 'usb:ABC123');
        
        const retrieved = DeviceIdentityCache.get('device-1');
        
        expect(retrieved).toBe('usb:ABC123');
    });
    
    it('should return null for non-existent device', () => {
        const retrieved = DeviceIdentityCache.get('non-existent');
        
        expect(retrieved).toBeNull();
    });
    
    it('should cleanup expired entries', () => {
        // Set cache with very old timestamp
        DeviceIdentityCache['cache'].set('device-1', {
            hardwareId: 'usb:ABC123',
            timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        });
        
        DeviceIdentityCache.cleanup();
        
        const retrieved = DeviceIdentityCache.get('device-1');
        
        expect(retrieved).toBeNull();
    });
});
