import test from 'node:test';
import assert from 'node:assert/strict';
import { classReminders, mergeReminderInbox, markReminderRead, classReminderStatus } from '../src/utils/classReminders.js';

const student = { id: 1, department: 'BSIT 1-A' };
const schedule = { id: 10, yearLevel: '1st Year', section: 'A', days: ['Monday'], subjectName: 'English', startTime: '08:00:00', endTime: '09:00:00' };
const monday = time => new Date(`2026-10-12T${time}+08:00`);

test('reminds at 30 minutes before class through its starting minute, then expires locally', () => {
  for (const [time, count, remaining] of [['07:29:59', 0], ['07:30:00', 1, 30], ['07:59:00', 1, 1], ['08:00:59', 1, 0], ['08:01:00', 0]]) {
    const reminders = classReminders([schedule], student, monday(time));
    assert.equal(reminders.length, count, time);
    if (count) assert.equal(reminders[0].minutesUntil, remaining, time);
  }
});

test('only reminds for the student section and the Manila weekday', () => {
  const rows = [schedule, { ...schedule, id: 11, section: 'B' }, { ...schedule, id: 12, yearLevel: '2nd Year' },
    { ...schedule, id: 13, days: ['Tuesday'] }, { ...schedule, id: 14, startTime: 'invalid' }];
  assert.deepEqual(classReminders(rows, student, monday('07:50:00')).map(row => row.id), [10]);
  assert.deepEqual(classReminders(rows, {}, monday('07:50:00')), []);
});

test('sorts by start time and gives each daily reminder a stable independent key', () => {
  const rows = [{ ...schedule, id: 11, startTime: '08:05:00' }, schedule];
  const first = classReminders(rows, student, monday('07:50:00'));
  const next = classReminders(rows, student, monday('07:51:00'));
  assert.deepEqual(first.map(row => row.id), [10, 11]);
  assert.deepEqual(first.map(row => row.key), next.map(row => row.key));
  assert.equal(new Set(first.map(row => row.key)).size, 2);
});

test('uses Manila Monday across UTC Sunday and expires previous-day reminders', () => {
  const midnight = { ...schedule, startTime: '00:10:00', endTime: '01:10:00' };
  const result = classReminders([midnight], student, new Date('2026-10-11T16:00:00Z'));
  assert.equal(result[0].minutesUntil, 10);
  assert.equal(result[0].key, '2026-10-12:10:00:10:00');
  assert.deepEqual(classReminders([midnight], student, new Date('2026-10-12T16:00:00Z')), []);
});


test('reminds about next-day classes within 30 minutes across Manila midnight', () => {
  const midnight = { ...schedule, startTime: '00:10:00', endTime: '01:10:00' };
  const result = classReminders([midnight], student, new Date('2026-10-11T23:40:00+08:00'));
  assert.equal(result.length, 1);
  assert.equal(result[0].minutesUntil, 30);
  assert.equal(result[0].classDate, '2026-10-12');
  assert.deepEqual(classReminders([midnight], student, new Date('2026-10-11T23:39:00+08:00')), []);
});

test('unread reminders survive class start, day changes and browser storage round trips', () => {
  const due = classReminders([schedule], student, monday('07:30:00'));
  const inbox = mergeReminderInbox({ notifications: [], readKeys: [] }, due);
  const restored = JSON.parse(JSON.stringify(inbox));
  assert.equal(mergeReminderInbox(restored, classReminders([schedule], student, monday('10:00:00'))).notifications.length, 1);
  assert.equal(mergeReminderInbox(restored, classReminders([schedule], student, new Date('2026-10-13T12:00:00+08:00'))).notifications.length, 1);
  assert.strictEqual(mergeReminderInbox(inbox, due), inbox);
});

test('marking a single reminder read preserves others and prevents its recreation', () => {
  const due = classReminders([schedule, { ...schedule, id: 11, startTime: '08:05:00' }], student, monday('07:50:00'));
  const inbox = mergeReminderInbox({ notifications: [], readKeys: [] }, due);
  const read = markReminderRead(inbox, due[0].key);
  assert.deepEqual(read.notifications.map(row => row.id), [11]);
  assert.deepEqual(read.readKeys, [due[0].key]);
  assert.strictEqual(mergeReminderInbox(read, due), read);
  const allRead = markReminderRead(read);
  assert.equal(allRead.notifications.length, 0);
  assert.equal(allRead.readKeys.length, 2);
  assert.strictEqual(mergeReminderInbox(JSON.parse(JSON.stringify(allRead)), due).notifications.length, 0);
});


test('labels unread notifications by scheduled start and end without removing them', () => {
  const reminder = { ...schedule, classDate: '2026-10-12' };
  for (const [time, expected] of [
    ['07:30:00', 'Starts in 30 minutes'], ['08:00:00', 'In class / starting now'],
    ['08:01:00', 'In class / started 1 minute ago'], ['08:10:00', 'In class / started 10 minutes ago'],
    ['08:30:00', 'In class / started 30 minutes ago'], ['08:59:59', 'In class / started 59 minutes ago'],
    ['09:00:00', 'Class ended just now'], ['09:01:00', 'Class ended / 1 minute ago'],
    ['09:30:00', 'Class ended / 30 minutes ago'],
  ]) assert.equal(classReminderStatus(reminder, monday(time)), expected, time);
  const inbox = mergeReminderInbox({ notifications: [], readKeys: [] }, [{ ...reminder, key: 'test' }]);
  classReminderStatus(inbox.notifications[0], monday('10:00:00'));
  assert.equal(inbox.notifications.length, 1);
});

test('status uses Manila dates for previous-day and overnight class notifications', () => {
  const reminder = { ...schedule, classDate: '2026-10-12', startTime: '23:30:00', endTime: '00:30:00' };
  assert.equal(classReminderStatus(reminder, new Date('2026-10-12T16:00:00Z')), 'In class / started 30 minutes ago');
  assert.equal(classReminderStatus(reminder, new Date('2026-10-13T00:40:00+08:00')), 'Class ended / 10 minutes ago');
  assert.equal(classReminderStatus({ ...schedule, classDate: '2026-10-12' }, new Date('2026-10-13T09:00:00+08:00')), 'Class ended / 1440 minutes ago');
});
