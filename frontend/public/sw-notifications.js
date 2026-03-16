/* Service Worker for ChatConnect Notifications with Reply — v2 */

// Cache the API base URL
const API_BASE = 'http://localhost:8000';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    const data = event.notification.data || {};
    event.notification.close();

    if (event.action === 'reply') {
        // For browsers that support inline reply (Chrome on Android, etc.)
        // The reply text is in event.reply
        // For desktop, we open the app and focus on the conversation
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
                // Try to focus an existing window
                for (const client of clients) {
                    if (client.url.includes('localhost:3000') || client.url.includes('localhost:8000')) {
                        client.focus();
                        client.postMessage({
                            type: 'NOTIFICATION_REPLY_FOCUS',
                            conversationId: data.conversationId,
                            senderId: data.senderId,
                            senderName: data.senderName,
                        });
                        return;
                    }
                }
                // If no window is open, open a new one
                return self.clients.openWindow('/');
            })
        );
    } else if (event.action === 'mark-read') {
        // Mark as read action - just close the notification
        // Could send an API call here if needed
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
                for (const client of clients) {
                    client.postMessage({
                        type: 'NOTIFICATION_MARK_READ',
                        conversationId: data.conversationId,
                    });
                }
            })
        );
    } else {
        // Default click - focus or open the app
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
                for (const client of clients) {
                    if (client.url.includes('localhost:3000') || client.url.includes('localhost:8000')) {
                        client.focus();
                        client.postMessage({
                            type: 'NOTIFICATION_CLICK',
                            conversationId: data.conversationId,
                        });
                        return;
                    }
                }
                return self.clients.openWindow('/');
            })
        );
    }
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, conversationId, senderId, senderName, icon } = event.data;

        self.registration.showNotification(title, {
            body: body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: `msg-${conversationId}`,
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: {
                conversationId,
                senderId,
                senderName,
            },
            actions: [
                {
                    action: 'reply',
                    title: '💬 Reply',
                    type: 'text',
                    placeholder: 'Type a reply...',
                },
                {
                    action: 'mark-read',
                    title: '✓ Mark as Read',
                },
            ],
        });
    }
});
