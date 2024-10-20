import { createConfiguration, DefaultApi, Notification as OSNotification } from "@onesignal/node-onesignal";

const APP_ID = process.env.ONE_SIGNAL_APP_ID;

const config = createConfiguration({
  restApiKey: process.env.ONE_SIGNAL_API_KEY,
});

const client = new DefaultApi(config);

export async function sendPushNotification({
  userId,
  headings,
  contents,
}: {
  userId: string;
  headings: NonNullable<OSNotification["headings"]>;
  contents: NonNullable<OSNotification["contents"]>;
}) {
  if (!APP_ID) {
    return;
  }

  const notification = new OSNotification();
  notification.app_id = APP_ID;
  notification.target_channel = "push";
  notification.include_aliases = { external_id: [userId] };

  notification.headings = headings;
  notification.contents = contents;

  return client.createNotification(notification);
}

export default client;
