import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, NotificationType } from '@capacitor/haptics';

export const NotificationService = {

    // Request permissions for Notifications
    async requestPermissions() {
        try {
            const result = await LocalNotifications.requestPermissions();
            return result.display === 'granted';
        } catch (e) {
            console.error("Error requesting notification permissions", e);
            return false;
        }
    },

    // Trigger Heavy Vibration + System Notification
    async triggerLowStockAlert(itemName, quantity) {
        try {
            // 1. Vibrate (Heavy/Long)
            await Haptics.vibrate({ duration: 500 }); // 500ms vibration

            // 2. Schedule Notification
            // Check implicit permission or just try scheduling (Capacitor handles checks usually)

            // Schedule
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: "⚠️ Low Stock Alert",
                        body: `Inventory for ${itemName} is running low! Only ${quantity} remaining.`,
                        id: new Date().getTime(), // Unique ID based on timestamp
                        schedule: { at: new Date(Date.now() + 100) }, // Fire almost immediately
                        sound: null, // Use default system sound
                        attachments: null,
                        actionTypeId: "",
                        extra: null
                    }
                ]
            });

        } catch (error) {
            console.error("Notification Failed:", error);
        }
    }
};
