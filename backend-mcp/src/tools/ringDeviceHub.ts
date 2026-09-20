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
      'Tích hợp hệ sinh thái thiết bị thông minh Ring (Ring Video Doorbell Pro & Ring Smart Access Lock). Cho phép kiểm tra camera thềm cửa, nhận diện kiện hàng Amazon Pharmacy giao tới, và tự động mở chốt cửa an toàn cho nhân viên cứu hộ/cấp cứu khi có sự cố y tế.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['checkFrontPorch', 'triggerEmergencyDoorUnlock', 'getDeviceStatus'],
          description:
            'Hành động cần thực hiện: checkFrontPorch (kiểm tra kiện hàng/camera trước cửa), triggerEmergencyDoorUnlock (mở chốt cửa cấp cứu y tế), getDeviceStatus (trạng thái thiết bị).',
        },
        reason: {
          type: 'string',
          description: 'Lý do thực hiện (ví dụ: "Medical Emergency Alert", "Medication Refill Delivery").',
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

    // Mặc định: checkFrontPorch (Kiểm tra camera thềm cửa & phát hiện kiện thuốc)
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
