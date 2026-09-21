export interface RingDeviceHubResult {
  success: boolean;
  action: 'checkFrontPorch' | 'triggerEmergencyDoorUnlock' | 'getDeviceStatus';
  cameraName: string;
  timestamp: string;
  doorLockStatus: 'LOCKED' | 'UNLOCKED FOR PARAMEDICS';
  motionDetected?: boolean;
  packageDetected?: boolean;
  packageDetails?: {
    carrier: string;
    description: string;
    deliveryTime: string;
    orderId?: string;
  };
  emergencyReason?: string;
  speechText: string;
  richCard?: {
    type: 'RingDoorbellFeed';
    cameraName: string;
    mode: 'delivery' | 'emergency' | 'live';
    doorLockStatus: string;
    packageDetected: boolean;
    packageDetails?: {
      carrier: string;
      description: string;
      deliveryTime: string;
      orderId?: string;
    };
    emergencyReason?: string;
    timestamp: string;
  };
}

export const ringDeviceHubTool = {
  definition: {
    name: 'ringDeviceHub',
    description:
      'Integrate Ring smart home ecosystem (Ring Video Doorbell Pro & Ring Smart Access Lock). Check front porch camera, verify Amazon Pharmacy deliveries, and unlock door for emergency paramedics.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['checkFrontPorch', 'triggerEmergencyDoorUnlock', 'getDeviceStatus'],
          description:
            'Action to perform: checkFrontPorch (inspect porch/package), triggerEmergencyDoorUnlock (emergency paramedic access), getDeviceStatus (device health).',
        },
        reason: {
          type: 'string',
          description: 'Reason for triggering device action (e.g. "Medical Emergency Alert", "Medication Refill Delivery").',
        },
      },
      required: ['action'],
    },
  },

  async handler(args: {
    action?: 'checkFrontPorch' | 'triggerEmergencyDoorUnlock' | 'getDeviceStatus';
    reason?: string;
  }): Promise<RingDeviceHubResult> {
    const timestamp = new Date().toISOString();
    const action = args?.action || 'checkFrontPorch';

    if (action === 'triggerEmergencyDoorUnlock') {
      const speechText = 'Ring Smart Access has unlocked the front door for incoming paramedics.';
      return {
        success: true,
        action: 'triggerEmergencyDoorUnlock',
        cameraName: 'Ring Doorbell Pro - Front Porch',
        timestamp,
        doorLockStatus: 'UNLOCKED FOR PARAMEDICS',
        emergencyReason: args?.reason || 'Critical Medical Alert Dispatched',
        speechText,
        richCard: {
          type: 'RingDoorbellFeed',
          cameraName: 'Ring Doorbell Pro - Front Porch',
          mode: 'emergency',
          doorLockStatus: 'UNLOCKED FOR PARAMEDICS',
          packageDetected: false,
          emergencyReason: args?.reason || 'Critical Medical Alert Dispatched',
          timestamp,
        },
      };
    }

    // Default action: checkFrontPorch (Inspect front porch camera & detect prescription parcel)
    const speechText = 'Ring Doorbell: Amazon Pharmacy package delivered at your front porch.';
    return {
      success: true,
      action: 'checkFrontPorch',
      cameraName: 'Ring Doorbell Pro - Front Porch',
      timestamp,
      motionDetected: true,
      packageDetected: true,
      packageDetails: {
        carrier: 'Amazon Prime Delivery',
        description: 'CareBridge Prescription Refill Parcel (30 Tablets)',
        deliveryTime: 'Just now',
        orderId: '114-7294821-4928103',
      },
      doorLockStatus: 'LOCKED',
      speechText,
      richCard: {
        type: 'RingDoorbellFeed',
        cameraName: 'Ring Doorbell Pro - Front Porch',
        mode: 'delivery',
        doorLockStatus: 'LOCKED',
        packageDetected: true,
        packageDetails: {
          carrier: 'Amazon Prime Delivery',
          description: 'CareBridge Prescription Refill Parcel (30 Tablets)',
          deliveryTime: 'Just now',
          orderId: '114-7294821-4928103',
        },
        timestamp,
      },
    };
  },
};
