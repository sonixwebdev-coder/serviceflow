const isPushEnabled = (preferences) => preferences.enablePushNotifications;

const isNotificationTypeEnabled = (preferences, preferenceName) =>
  preferences.enablePushNotifications && preferences[preferenceName];

module.exports = { isNotificationTypeEnabled, isPushEnabled };
