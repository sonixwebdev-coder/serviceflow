const toWebPushSubscription = (subscription) => ({
  endpoint: subscription.endpoint,
  keys: subscription.keys,
});

const serializePushPayload = (payload) => JSON.stringify(payload);

const summarizeSubscriptionDeliveries = (results) => {
  const sent = results.filter(
    (result) => result.status === 'fulfilled' && result.value.success
  ).length;
  const failed = results.length - sent;

  return { sent, failed, total: results.length };
};

const summarizeUserDeliveries = (results) =>
  results.reduce(
    (summary, result) => {
      if (result.status === 'fulfilled') {
        summary.sent += result.value.sent;
        summary.failed += result.value.failed;
      } else {
        summary.errors.push(result.reason.message);
      }
      return summary;
    },
    { sent: 0, failed: 0, errors: [] }
  );

module.exports = {
  serializePushPayload,
  summarizeSubscriptionDeliveries,
  summarizeUserDeliveries,
  toWebPushSubscription,
};
