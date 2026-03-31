import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDeviceUnifiedStore } from '../../src/store/modules/deviceUnified'
import { DeviceIdentity, DeviceIdentityCache } from '../../electron/mapi/adb/DeviceIdentity'

// Mock window.$mapi
const mockDbExecute = vi.fn()
const mockDbQuery = vi.fn()
const mockAdbDevices = vi.fn()

global.window = {
    $mapi: {
        db: {
            execute: mockDbExecute,
            query: mockDbQuery
        },
        adb: {
            devices: mockAdbDevices
        }
    }
} as any

describe('DeviceUnified Store', () => {
    let store: ReturnType<typeof useDeviceUnifiedStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useDeviceUnifiedStore()
        vi.clearAllMocks()
    })

    describe('Initial State', () => {
        it('should initialize with empty devices', () => {
            expect(store.unifiedDevices).toEqual([])
            expect(store.deviceCount).toBe(0)
        })

        it('should initialize with loading state false', () => {
            expect(store.isLoading).toBe(false)
        })

        it('should initialize with null error', () => {
            expect(store.error).toBeNull()
        })
    })

    describe('Computed Properties', () => {
        beforeEach(() => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [
                        {
                            id: 'conn-1',
                            type: 'usb',
                            status: 'online',
                            address: 'ABC123',
                            connectedAt: new Date(),
                            lastActiveAt: new Date(),
                            isDefault: true
                        }
                    ],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: ['work'],
                    totalConnections: 1,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    unifiedId: 'uuid-2',
                    identity: {
                        hardwareId: 'mac:aa:bb:cc:dd:ee',
                        model: 'Galaxy S21',
                        brand: 'Samsung',
                        androidVersion: '12',
                        sdkVersion: 32,
                        fingerprint: 'fp-2'
                    },
                    name: 'Device 2',
                    connections: [
                        {
                            id: 'conn-2',
                            type: 'wifi_debug',
                            status: 'offline',
                            address: '192.168.1.100:5555',
                            connectedAt: new Date(),
                            lastActiveAt: new Date(),
                            isDefault: true
                        }
                    ],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 1,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]
        })

        it('should count total devices', () => {
            expect(store.deviceCount).toBe(2)
        })

        it('should filter connected devices', () => {
            expect(store.connectedDevices).toHaveLength(1)
            expect(store.connectedDevices[0].name).toBe('Device 1')
        })

        it('should filter USB devices', () => {
            expect(store.usbDevices).toHaveLength(1)
            expect(store.usbDevices[0].identity.hardwareId).toBe('usb:ABC123')
        })

        it('should filter WiFi devices', () => {
            expect(store.wifiDevices).toHaveLength(1)
            expect(store.wifiDevices[0].identity.hardwareId).toBe('mac:aa:bb:cc:dd:ee')
        })

        it('should get device by unifiedId', () => {
            const device = store.getDeviceByUnifiedId('uuid-1')
            expect(device).toBeDefined()
            expect(device?.name).toBe('Device 1')
        })

        it('should get device by hardwareId', () => {
            const device = store.getDeviceByHardwareId('usb:ABC123')
            expect(device).toBeDefined()
            expect(device?.identity.model).toBe('Pixel 6')
        })
    })

    describe('syncDevices', () => {
        it('should sync devices from ADB', async () => {
            const mockAdbDeviceList = [
                {
                    id: 'ABC123',
                    model: 'Pixel 6',
                    brand: 'Google',
                    version: '13',
                    sdkVersion: '33',
                    state: 'device'
                }
            ]

            mockAdbDevices.mockResolvedValue(mockAdbDeviceList)
            vi.spyOn(DeviceIdentity, 'generateHardwareId').mockResolvedValue('usb:ABC123')
            vi.spyOn(DeviceIdentity, 'generateFingerprint').mockReturnValue('fp-1')
            mockDbExecute.mockResolvedValue({})

            await store.syncDevices()

            expect(mockAdbDevices).toHaveBeenCalled()
            expect(store.isLoading).toBe(false)
            expect(store.unifiedDevices.length).toBeGreaterThan(0)
            expect(store.lastSyncTime).toBeDefined()
        })

        it('should handle empty device list', async () => {
            mockAdbDevices.mockResolvedValue([])

            await store.syncDevices()

            expect(mockAdbDevices).toHaveBeenCalled()
            expect(store.isLoading).toBe(false)
            expect(store.unifiedDevices).toEqual([])
        })

        it('should handle ADB error', async () => {
            mockAdbDevices.mockRejectedValue(new Error('ADB not running'))

            await store.syncDevices()

            expect(store.error).toBe('ADB not running')
            expect(store.isLoading).toBe(false)
        })
    })

    describe('addOrUpdateDevice', () => {
        it('should create new device when not exists', async () => {
            const mockAdbDevice = {
                id: 'ABC123',
                model: 'Pixel 6',
                brand: 'Google',
                version: '13',
                sdkVersion: '33',
                state: 'device'
            }

            vi.spyOn(DeviceIdentity, 'generateHardwareId').mockResolvedValue('usb:ABC123')
            vi.spyOn(DeviceIdentity, 'generateFingerprint').mockReturnValue('fp-1')
            mockDbExecute.mockResolvedValue({})

            await store.addOrUpdateDevice(mockAdbDevice)

            expect(store.unifiedDevices).toHaveLength(1)
            expect(store.unifiedDevices[0].identity.hardwareId).toBe('usb:ABC123')
            expect(mockDbExecute).toHaveBeenCalledTimes(2)
        })

        it('should update existing device connection', async () => {
            const mockAdbDevice = {
                id: 'ABC123',
                model: 'Pixel 6',
                brand: 'Google',
                version: '13',
                sdkVersion: '33',
                state: 'device'
            }

            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [
                        {
                            id: 'conn-1',
                            type: 'usb',
                            status: 'offline',
                            address: 'ABC123',
                            connectedAt: new Date(),
                            lastActiveAt: new Date(),
                            isDefault: true
                        }
                    ],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 1,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            await store.addOrUpdateDevice(mockAdbDevice)

            expect(store.unifiedDevices).toHaveLength(1)
            expect(store.unifiedDevices[0].connections[0].status).toBe('device')
        })

        it('should add new connection to existing device', async () => {
            const mockAdbDevice = {
                id: '192.168.1.100:5555',
                model: 'Pixel 6',
                brand: 'Google',
                version: '13',
                sdkVersion: '33',
                state: 'device'
            }

            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [
                        {
                            id: 'conn-1',
                            type: 'usb',
                            status: 'online',
                            address: 'ABC123',
                            connectedAt: new Date(),
                            lastActiveAt: new Date(),
                            isDefault: true
                        }
                    ],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 1,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            vi.spyOn(DeviceIdentity, 'generateHardwareId').mockResolvedValue('usb:ABC123')

            await store.addOrUpdateDevice(mockAdbDevice)

            expect(store.unifiedDevices).toHaveLength(1)
            expect(store.unifiedDevices[0].connections).toHaveLength(2)
            expect(store.unifiedDevices[0].totalConnections).toBe(2)
        })
    })

    describe('updateDeviceName', () => {
        it('should update device name', async () => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Old Name',
                    connections: [],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 0,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            mockDbExecute.mockResolvedValue({})

            await store.updateDeviceName('uuid-1', 'New Name')

            expect(store.unifiedDevices[0].name).toBe('New Name')
            expect(mockDbExecute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE device_unified'),
                expect.arrayContaining(['New Name', expect.any(String), 'uuid-1'])
            )
        })

        it('should handle non-existent device', async () => {
            await store.updateDeviceName('non-existent', 'New Name')
            expect(mockDbExecute).not.toHaveBeenCalled()
        })
    })

    describe('updateDeviceSetting', () => {
        it('should update device setting', async () => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 0,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            mockDbExecute.mockResolvedValue({})

            await store.updateDeviceSetting('uuid-1', { autoSyncFiles: true })

            expect(store.unifiedDevices[0].setting.autoSyncFiles).toBe(true)
            expect(mockDbExecute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE device_unified'),
                expect.arrayContaining([expect.any(String), expect.any(String), 'uuid-1'])
            )
        })
    })

    describe('addDeviceTag and removeDeviceTag', () => {
        it('should add device tag', async () => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 0,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            mockDbExecute.mockResolvedValue({})

            await store.addDeviceTag('uuid-1', 'work')

            expect(store.unifiedDevices[0].tags).toContain('work')
            expect(mockDbExecute).toHaveBeenCalled()
        })

        it('should not add duplicate tag', async () => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: ['work'],
                    totalConnections: 0,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            await store.addDeviceTag('uuid-1', 'work')

            expect(store.unifiedDevices[0].tags).toHaveLength(1)
        })

        it('should remove device tag', async () => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: ['work', 'personal'],
                    totalConnections: 0,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            mockDbExecute.mockResolvedValue({})

            await store.removeDeviceTag('uuid-1', 'work')

            expect(store.unifiedDevices[0].tags).not.toContain('work')
            expect(store.unifiedDevices[0].tags).toContain('personal')
            expect(mockDbExecute).toHaveBeenCalled()
        })
    })

    describe('loadFromDatabase', () => {
        it('should load devices from database', async () => {
            const mockDbResult = [
                {
                    unified_id: 'uuid-1',
                    hardware_id: 'usb:ABC123',
                    model: 'Pixel 6',
                    brand: 'Google',
                    android_version: '13',
                    sdk_version: 33,
                    fingerprint: 'fp-1',
                    name: 'Device 1',
                    setting: JSON.stringify({
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    }),
                    tags: JSON.stringify(['work']),
                    total_connections: 1,
                    first_connected_at: new Date().toISOString(),
                    last_connected_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    connection_id: 'conn-1',
                    connection_type: 'usb',
                    connection_status: 'online',
                    address: 'ABC123',
                    conn_connected_at: new Date().toISOString(),
                    conn_last_active_at: new Date().toISOString(),
                    is_default: 1
                }
            ]

            mockDbQuery.mockResolvedValue(mockDbResult)

            await store.loadFromDatabase()

            expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'))
            expect(store.unifiedDevices).toHaveLength(1)
            expect(store.unifiedDevices[0].name).toBe('Device 1')
            expect(store.unifiedDevices[0].connections).toHaveLength(1)
        })

        it('should handle database error', async () => {
            mockDbQuery.mockRejectedValue(new Error('Database not initialized'))

            await store.loadFromDatabase()

            expect(store.error).toBe('Database not initialized')
        })
    })

    describe('removeDevice', () => {
        it('should mark device as offline', () => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [
                        {
                            id: 'conn-1',
                            type: 'usb',
                            status: 'online',
                            address: 'ABC123',
                            connectedAt: new Date(),
                            lastActiveAt: new Date(),
                            isDefault: true
                        }
                    ],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 1,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            store.removeDevice('uuid-1')

            expect(store.unifiedDevices[0].connections[0].status).toBe('offline')
        })

        it('should handle non-existent device', () => {
            expect(() => store.removeDevice('non-existent')).not.toThrow()
        })
    })

    describe('clearOfflineDevices', () => {
        it('should remove offline devices', async () => {
            store.unifiedDevices = [
                {
                    unifiedId: 'uuid-1',
                    identity: {
                        hardwareId: 'usb:ABC123',
                        model: 'Pixel 6',
                        brand: 'Google',
                        androidVersion: '13',
                        sdkVersion: 33,
                        fingerprint: 'fp-1'
                    },
                    name: 'Device 1',
                    connections: [
                        {
                            id: 'conn-1',
                            type: 'usb',
                            status: 'online',
                            address: 'ABC123',
                            connectedAt: new Date(),
                            lastActiveAt: new Date(),
                            isDefault: true
                        }
                    ],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 1,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    unifiedId: 'uuid-2',
                    identity: {
                        hardwareId: 'usb:XYZ789',
                        model: 'Galaxy S21',
                        brand: 'Samsung',
                        androidVersion: '12',
                        sdkVersion: 32,
                        fingerprint: 'fp-2'
                    },
                    name: 'Device 2',
                    connections: [
                        {
                            id: 'conn-2',
                            type: 'usb',
                            status: 'offline',
                            address: 'XYZ789',
                            connectedAt: new Date(),
                            lastActiveAt: new Date(),
                            isDefault: true
                        }
                    ],
                    setting: {
                        autoSyncFiles: false,
                        syncDirectories: [],
                        notificationEnabled: true
                    },
                    tags: [],
                    totalConnections: 1,
                    firstConnectedAt: new Date(),
                    lastConnectedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            await store.clearOfflineDevices()

            expect(store.unifiedDevices).toHaveLength(1)
            expect(store.unifiedDevices[0].name).toBe('Device 1')
        })
    })
})
