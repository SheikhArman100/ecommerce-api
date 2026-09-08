export const notificationFilterableFields = [
  'searchTerm',
  'type',
  'isRead',
  'userId',
];

export const notificationSearchableFields = ['title', 'body'];

/** Socket event name emitted when a new notification is created. */
export const NOTIFICATION_EVENT = 'notification:new';